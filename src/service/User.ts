import clientPromise from '../db/conn';
import {
  UserWithAccountsWithId,
  UserWithId,
  UserWithAccountsAndSettingsWithId,
  TUser,
  DefaultClips
} from '../api/user/user.model.js';
import { ObjectId } from 'mongodb';

export const getAllUsers = async () => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId>('User');

  const users = await db.find().toArray();

  return users;
};

export const getUserById = async (id: string) => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId>('User');

  const user = await db.findOne({ _id: new ObjectId(id) });

  return user;
};

export const updateUserDefaultClipsById = async (id: string, defaultClip: DefaultClips) => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId>('User');

  const updatedUser = await db.updateOne(
    { _id: new ObjectId(id) },
    { $set: { defaultClips: defaultClip } }
  );

  return updatedUser;
};
export const getUserByIdWithAccountsAndSettings = async (id: string) => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId[]>('User');

  const user = await db
    .aggregate([
      { $match: { _id: new ObjectId(id) } },
      { $addFields: { userId: { $toString: '$_id' } } },
      {
        $lookup: {
          from: 'Account',
          localField: 'userId',
          foreignField: 'userId',
          as: 'accounts'
        }
      },
      {
        $lookup: {
          from: 'Setting',
          localField: '_id',
          foreignField: 'userId',
          as: 'settings'
        }
      }
    ])
    .toArray();
  return user?.[0] as UserWithAccountsAndSettingsWithId;
};

type UserAccountWithUserId = UserWithAccountsWithId & { userId: string };
export const getUsersWithoutClips = async () => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId>('User');

  const users = (await db
    .aggregate([
      { $match: { defaultClips: { $in: [null, 'pending'] } } },
      { $addFields: { userId: { $toString: '$_id' } } },
      {
        $lookup: {
          from: 'Account',
          localField: 'userId',
          foreignField: 'userId',
          as: 'accounts'
        }
      }
    ])
    .toArray()) as UserAccountWithUserId[];

  return users;
};
export const getUsersLatestsClips = async () => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId>('User');
  const users = (await db
    .aggregate([
      { $match: { defaultClips: { $in: [null, 'complete'] } } },
      { $addFields: { userId: { $toString: '$_id' } } },
      {
        $lookup: {
          from: 'Account',
          localField: 'userId',
          foreignField: 'userId',
          as: 'accounts'
        }
      },
      {
        $lookup: {
          from: 'Setting',
          localField: '_id',
          foreignField: 'userId',
          as: 'settings',
          pipeline: [{ $match: { lastUploaded: { $ne: null } } }]
        }
      },
      { $match: { settings: { $ne: [] } } }
    ])
    .toArray()) as UserWithAccountsAndSettingsWithId[];

  return users;
};
