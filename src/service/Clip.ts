import clientPromise from '../db/conn';

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

// export const updateClip = async (clipId: string, clipData: any) => {
//   if (!clipId) return;
//   const updatedAccount = await Clips.findOneAndUpdate(
//     { _id: clipId },
//     { $set: { ...clipData } },
//     { returnDocument: 'after' }
//   );

//   return updatedAccount;
// };
