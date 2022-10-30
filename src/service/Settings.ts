import clientPromise from '../db/conn';
import { TSettings } from '../interfaces/Settings';
import { ObjectId } from 'mongodb';

export const updateLastUploadDate = async (
  userId: string,
  lastUpload: Date,
  lastUploadedId: string
) => {
  if (!userId || !lastUpload) return;
  const client = await clientPromise;
  const db = client.db().collection<TSettings>('Setting');

  const updatedUserSettings = await db.updateOne(
    { userId: new ObjectId(userId) },
    { $set: { lastUploaded: lastUpload, lastUploadedId: lastUploadedId } }
  );

  return updatedUserSettings;
};

export const getUsersSettingsById = async (userId: string) => {
  const client = await clientPromise;
  const db = client.db().collection<TSettings>('Setting');

  const userSettings = await db
    .find({
      userId: new ObjectId(userId)
    })
    .toArray();

  return userSettings[0];
};
