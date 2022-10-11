import clientPromise from '../db/conn';
import { ClipManualWithUserId } from '../api/crop/crop.model';
import log from '../utils/logger';

export const saveTwitchClips = async (clips: ClipManualWithUserId[]) => {
  if (!clips) {
    log('warn', 'unable to save clips - not found', undefined, 'saveTwitchClips');
    return;
  }
  const client = await clientPromise;
  const db = client.db().collection<ClipManualWithUserId>('TwitchClip');
  const updatedAccount = await db.insertMany(clips);

  return updatedAccount;
};

export const bulkSaveTwitchClips = async (clips: ClipManualWithUserId[]) => {
  if (!clips) {
    log('warn', 'unable to save clips - not found', undefined, 'bulkSaveTwitchClips');
    return;
  }
  const client = await clientPromise;
  const db = client.db().collection<ClipManualWithUserId>('TwitchClip');
  let bulk_ops_arr = [];

  for (let clip of clips) {
    let update_op = {
      updateOne: {
        filter: { userId: clip.userId, id: clip.id },
        update: { $set: clip },
        upsert: true
      }
    };
    bulk_ops_arr.push(update_op);
  }

  const updatedAccounts = await db.bulkWrite(bulk_ops_arr);
  log('info', 'clips updated', updatedAccounts, 'bulkSaveTwitchClips');
  return updatedAccounts;
};
