import clientPromise from '../db/conn';
import { ObjectId } from 'mongodb';
import { ClipManualWithUserId, ClipWithIdMongo } from '../api/crop/crop.model';
import log from '../utils/logger';

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
