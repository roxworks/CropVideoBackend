import clientPromise from '../db/conn';
import { TSettings } from '../interfaces/Settings';
import { ObjectId } from 'mongodb';

export const updateLastUploadDate = async (userId: string, lastUpload: Date) => {
  if (!userId || !lastUpload) return;
  const client = await clientPromise;
  const db = client.db().collection<TSettings>('Setting');

  const updatedUserSettings = await db.updateOne(
    { userId: new ObjectId(userId) },
    { $set: { lastUploaded: lastUpload } }
  );

  return updatedUserSettings;
};
