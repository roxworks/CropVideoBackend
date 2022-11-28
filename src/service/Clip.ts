import { Clip, TwitchClip } from '@prisma/client';
import { CropTemplate } from '../interfaces/CropTemplate';
import { ClipManualWithUserId, ClipWithRenderedUrl } from '../api/crop/crop.model';
import log from '../utils/logger';
import { TSettings } from '../interfaces/Settings';
import { getCropTemplateByType, TCropType } from './CropTemplate';
import prisma from '../db/conn';
import { convertTags, convertToClipFromTwitchClip, convertToCropData } from '../utils/helpers';

export const getClipsReadyToUploaded = async () => {
  try {
    const clips = await prisma.clip.findMany({
      where: {
        uploaded: false,
        status: 'RENDERED',
        NOT: [{ scheduledUploadTime: null }, { renderedUrl: null }],
        AND: [{ scheduledUploadTime: { lte: new Date(new Date().toUTCString()) } }],
      },
    });

    return { count: clips.length, clips } as { count: number; clips: ClipWithRenderedUrl[] };
  } catch (error) {
    log('error', 'getClipsreadToUpload failed', error);
    return { count: 0, clips: [] } as { count: number; clips: ClipWithRenderedUrl[] };
  }
};

export const scheduledClipsFromTime = async (userId: string, time: string) => {
  // TODO:: make sure userId is converted to object for mongodb

  try {
    const clips = await prisma.clip.findMany({
      where: {
        userId,
        scheduledUploadTime: new Date(time),
      },
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
      data: { ...clipData },
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
          twitch_id: clipId,
        },
      },
      data: { uploaded: true },
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
            OR: [{ scheduled: false }, { scheduled: { isSet: false } }],
          },
          {
            OR: [{ uploaded: false }, { uploaded: { isSet: false } }],
          },
        ],
        approved: true,
      },
      orderBy: { created_at: 'asc' },
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
  cropTemplate: CropTemplate
) => {
  let clipCropData: CropTemplate | undefined;
  if (clip.cropType) {
    clipCropData = await getCropTemplateByType(clip.userId, clip.cropType as TCropType);
  }

  const caption = `${clip.caption || clip.title} ${convertTags(clip.instagramHashtags)}`;

  const cropData = convertToCropData({
    cropTemplate,
    clipCropData,
    startTime: clip.startTime ?? undefined,
    endTime: clip.endTime ?? undefined,
  });

  const clipData = convertToClipFromTwitchClip({
    clip,
    settings,
    scheduleTime,
    caption,
    cropData,
    approved: true,
  });

  const insertedClip = await prisma.clip.create({ data: clipData });
  await prisma.twitchClip.updateMany({
    where: {
      userId: clip.userId,
      twitch_id: clip.twitch_id,
      approved: true,
    },
    data: { scheduled: true },
  });

  return insertedClip;
};
