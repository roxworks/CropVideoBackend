import MongoDB from '../db/conn.js';
const Clips = MongoDB.Collection('Clip');

export const getAllClips = async () => {
  const clips = await Clips.find().toArray();

  return clips;
};

export const getClipsReadyToUploaded = async () => {
  const clips = await Clips.find({
    uploaded: false,
    status: 'RENDERED',
    scheduledUploadTime: { $ne: null },
    scheduledUploadTime: { $lte: new Date(new Date().toUTCString()) },
  }).toArray();

  return { count: clips.length, clips };
};

export const updateClip = async (clipId, clipData) => {
  if (!clipId) return;
  const updatedAccount = await Clips.findOneAndUpdate(
    { _id: clipId },
    { $set: { ...clipData } },
    { returnDocument: 'after' }
  );

  return updatedAccount;
};
