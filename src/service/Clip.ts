import { CropTemplate, CropTemplateWithId } from './../interfaces/CropTemplate';
import clientPromise from '../db/conn';
import { ObjectId } from 'mongodb';
import {
  Clip,
  ClipManualWithUserId,
  ClipWithIdMongo,
  CropData,
  platformsSchema
} from '../api/crop/crop.model';
import log from '../utils/logger';
import { TSettings } from '../interfaces/Settings';
import { getCropTemplateByType } from './CropTemplate';

// export const getAllClips = async () => {
//   const clips = await Clips.find().toArray();

//   return clips;
// };

export const getClipsReadyToUploaded = async () => {
  const client = await clientPromise;
  const db = client.db().collection('Clip');
  const clips = await db
    .find({
      uploaded: false,
      status: 'RENDERED',
      scheduledUploadTime: { $ne: null },
      $and: [{ scheduledUploadTime: { $lte: new Date(new Date().toUTCString()) } }]
    })
    .toArray();

  return { count: clips.length, clips } as { count: number; clips: ClipWithIdMongo[] };
};
export const scheduledClipsFromTime = async (userId: string, time: string) => {
  const client = await clientPromise;
  const db = client.db().collection('Clip');

  const clips = await db
    .find({
      userId: new ObjectId(userId),
      scheduledUploadTime: new Date(time)
    })
    .toArray();

  return { count: clips.length, clips } as { count: number; clips: ClipWithIdMongo[] };
};

export const updateClip = async (clipId: string, clipData: any) => {
  if (!clipId) {
    log('error', 'no clip id', { clipData });
    return;
  }
  const client = await clientPromise;
  const db = client.db().collection<ClipWithIdMongo>('Clip');
  const updatedAccount = await db.findOneAndUpdate(
    { _id: new ObjectId(clipId) },
    { $set: { ...clipData } },
    { returnDocument: 'after' }
  );

  return updatedAccount;
};

export const saveTwitchClips = async (clips: ClipManualWithUserId[]) => {
  if (!clips) {
    log('error', 'unable to save clips - not found', undefined, 'saveTwitchClips');
    return;
  }
  const client = await clientPromise;
  const db = client.db().collection<ClipManualWithUserId>('TwitchClip');
  const updatedAccount = await db.insertMany(clips);

  return updatedAccount;
};

export const getUsersApprovedClips = async (userId: string) => {
  const client = await clientPromise;
  const db = client.db().collection<ClipManualWithUserId>('TwitchClip');
  const clips = await db
    .find({
      userId: userId,
      approved: true,
      $and: [
        { $or: [{ scheduled: false }, { scheduled: { $exists: false } }] },
        { $or: [{ uploaded: false }, { uploaded: { $exists: false } }] }
      ]
    })
    .sort({ created_at: 1 })
    .toArray();

  return clips;
};

export const scheduleClips = async (
  clip: ClipManualWithUserId,
  scheduleTime: string,
  settings: TSettings,
  CropTemplate: CropTemplate
) => {
  const client = await clientPromise;
  const db = client.db().collection<Clip>('Clip');
  const twitchClip = client.db().collection<ClipManualWithUserId>('TwitchClip');

  let clipCropData: CropTemplateWithId | undefined;
  if (clip.cropType) {
    clipCropData = await getCropTemplateByType(clip.userId, clip.cropType);
  }

  const cropData: CropData = {
    camCrop: clipCropData?.camCrop || CropTemplate.camCrop || undefined,
    screenCrop: clipCropData?.screenCrop || CropTemplate.screenCrop,
    cropType: clipCropData?.cropType || CropTemplate.cropType
  };
  const clipData: Clip = {
    userId: new ObjectId(clip.userId!),
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
    caption: clip.title,
    youtubeTitle: clip.youtubeTitle || clip.title,
    youtubeCategory: clip.youtubeCategory || settings.youtubeCategory || 'Gaming',
    description: clip.youtubeDescription || settings.youtubeDescription,
    cropData: cropData,
    youtubePrivacy: clip.youtubePrivacy || settings.youtubePrivacy
  };

  const insertedClip = await db.insertOne(clipData);
  await twitchClip.updateOne(
    { userId: clip.userId, twitch_id: clip.twitch_id, approved: true },
    { $set: { scheduled: true } }
  );

  return insertedClip;
};

type LowerPlatforms = ('tiktok' | 'youtube' | 'instagram')[];
export const convertPlatformString = (platforms: LowerPlatforms): platformsSchema[] => {
  const map = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram' };

  const updatedArray = platforms.map((platform) => map[platform]) as platformsSchema[];

  return updatedArray;
};
