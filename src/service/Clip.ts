import clientPromise from '../db/conn';
import { ObjectId } from 'mongodb';
import { ClipWithIdMongo } from '../api/crop/crop.model';

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
      $and: [{ scheduledUploadTime: { $lte: new Date(new Date().toUTCString()) } }],
    })
    .toArray();

  return { count: clips.length, clips };
};

export const updateClip = async (clipId: string, clipData: any) => {
  if (!clipId) return;
  const client = await clientPromise;
  const db = client.db().collection<ClipWithIdMongo>('Clip');
  const updatedAccount = await db.findOneAndUpdate(
    { _id: new ObjectId(clipId) },
    { $set: { ...clipData } },
    { returnDocument: 'after' }
  );

  return updatedAccount;
};
