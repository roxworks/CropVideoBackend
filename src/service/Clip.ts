import { CropTemplate } from './../interfaces/CropTemplate';
import clientPromise from '../db/conn';
import {
  Clip as TClip,
  ClipManualWithUserId,
  ClipWithRenderedUrl,
  CropData,
  platformsSchema
} from '../api/crop/crop.model';
import log from '../utils/logger';
import { TSettings } from '../interfaces/Settings';
import { getCropTemplateByType, TCropType } from './CropTemplate';
import prisma from '../db/conn';
import { Clip, Prisma, TwitchClip } from '@prisma/client';

export const getClipsReadyToUploaded = async () => {
  try {
    const clips = await prisma.clip.findMany({
      where: {
        uploaded: false,
        status: 'RENDERED',
        NOT: [{ scheduledUploadTime: null }, { renderedUrl: null }],
        AND: [{ scheduledUploadTime: { lte: new Date(new Date().toUTCString()) } }]
      }
    });

    return { count: clips.length, clips } as { count: number; clips: ClipWithRenderedUrl[] };
  } catch (error) {
    log('error', 'getClipsreadToUpload failed', error);
    return { count: 0, clips: [] } as { count: number; clips: ClipWithRenderedUrl[] };
  }
};

export const scheduledClipsFromTime = async (userId: string, time: string) => {
  //TODO:: make sure userId is converted to object for mongodb

  try {
    const clips = await prisma.clip.findMany({
      where: {
        userId: userId,
        scheduledUploadTime: new Date(time)
      }
    });

    return { count: clips.length, clips };
  } catch (error) {
    log('error', 'scheduledCLipsfromTime', error);
    return { count: 0, clips: [] } as { count: number; clips: Clip[] };
  }
};

export const updateClip = async (clipId: string, clipData: any) => {
  try {
    return (await prisma.clip.update({
      where: { id: clipId },
      data: { ...clipData }
    })) as ClipWithRenderedUrl;
  } catch (error) {
    log('error', 'updateClip Error', error);
    return {} as ClipWithRenderedUrl;
  }
};
export const updateTwitchClipUploaded = async (clipId: string, userId: string) => {
  try {
    return await prisma.twitchClip.update({
      where: {
        userId_twitch_id: {
          userId,
          twitch_id: clipId
        }
      },
      data: { uploaded: true }
    });
  } catch (error) {
    log('error', 'updateTwitchClipUploaded Error', error);
    return {} as TwitchClip;
  }
};

export const saveTwitchClips = async (clips: ClipManualWithUserId[]) => {
  try {
    return await prisma.twitchClip.createMany({ data: clips });
  } catch (error) {
    log('error', 'saveTwitchClips Error', error);
    return { count: 0, error: true };
  }
};

export const getUsersApprovedClips = async (userId: string) => {
  try {
    return await prisma.twitchClip.findMany({
      where: {
        userId,
        AND: [
          {
            OR: [{ scheduled: false }, { scheduled: { isSet: false } }]
          },
          {
            OR: [{ uploaded: false }, { uploaded: { isSet: false } }]
          }
        ],
        approved: true
      },
      orderBy: { created_at: 'asc' }
    });
  } catch (error) {
    log('error', 'getUsersApprovedClips Error', error);
    return [] as TwitchClip[];
  }
};

export const scheduleClips = async (
  clip: TwitchClip,
  scheduleTime: string,
  settings: TSettings,
  CropTemplate: CropTemplate
) => {
  let clipCropData: CropTemplate | undefined;
  if (clip.cropType) {
    clipCropData = await getCropTemplateByType(clip.userId, clip.cropType as TCropType);
  }

  const caption = `${clip.caption || clip.title} ${clip.instagramHashtags
    ?.map((tag) => '%23' + tag)
    .join(' ')}`;

  const cropData: CropData = {
    camCrop: (clipCropData && clipCropData.camCrop) || CropTemplate.camCrop || null,
    screenCrop: clipCropData?.screenCrop || CropTemplate.screenCrop,
    cropType: clipCropData?.cropType || CropTemplate.cropType,
    startTime: typeof clip.startTime === 'number' ? new Prisma.Decimal(clip.startTime) : null,
    endTime: typeof clip.endTime === 'number' ? new Prisma.Decimal(clip.endTime) : null
  };

  const clipData: TClip = {
    userId: clip.userId,
    broadcasterName: clip.broadcaster_name,
    broadcasterId: clip.broadcaster_id,
    creatorName: clip.creator_name,
    creatorId: clip.creator_id,
    embedUrl: clip.embed_url,
    gameId: clip.game_id,
    language: clip.language,
    title: clip.title,
    url: clip.url,
    videoId: clip.twitch_id,
    viewCount: clip.view_count,
    thumbnailUrl: clip.thumbnail_url,
    createdAt: new Date(clip.created_at),
    downloadUrl: clip.download_url,
    approved: true,
    status: 'SCHEDULED',
    uploadPlatforms: convertPlatformString(settings.selectedPlatforms!),
    scheduledUploadTime: new Date(scheduleTime),
    uploaded: false,
    caption: caption,
    youtubeTitle: clip.youtubeTitle || clip.title,
    youtubeCategory: clip.youtubeCategory || settings.youtubeCategory || 'Gaming',
    description: (clip.youtubeDescription || settings.youtubeDescription) ?? null,
    cropData: cropData,
    youtubePrivacy: clip.youtubePrivacy || settings.youtubePrivacy,
    facebookDescription: clip.facebookDescription || clip.title
  };

  const insertedClip = await prisma.clip.create({ data: clipData });
  await prisma.twitchClip.updateMany({
    where: {
      userId: clip.userId,
      twitch_id: clip.twitch_id,
      approved: true
    },
    data: { scheduled: true }
  });

  return insertedClip;
};

type LowerPlatforms = ('tiktok' | 'youtube' | 'instagram' | 'facebook')[];
export const convertPlatformString = (platforms: LowerPlatforms): platformsSchema[] => {
  const map = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    facebook: 'Facebook'
  };

  const updatedArray = platforms.map((platform) => map[platform]) as platformsSchema[];

  return updatedArray;
};
