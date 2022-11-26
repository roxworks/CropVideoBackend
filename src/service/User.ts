import { Setting } from '@prisma/client';
import clientPromise from '../db/conn';
import {
  UserWithAccountsWithId,
  UserWithId,
  UserWithAccountsAndSettingsWithId,
  DefaultClips
} from '../api/user/user.model.js';
import prisma from '../db/conn';
import log from '../utils/logger';

export const getAllUsers = async () => {
  return await prisma.user.findMany();
};

export const getUserById = async (id: string) => {
  return await prisma.user.findUnique({ where: { id } });
};

export const updateUserDefaultClipsById = async (id: string, defaultClip: DefaultClips) => {
  return await prisma.user.update({ where: { id }, data: { defaultClips: defaultClip } });
};

export const getUserByIdWithAccountsAndSettings = async (id: string) => {
  const user = prisma.user.findUnique({
    where: { id },
    include: {
      settings: true,
      accounts: true
    }
  });
  return user;
};

type UserAccountWithUserId = UserWithAccountsWithId & { userId: string };
export const getUsersWithoutClips = async () => {
  //TODO:: does this include accounts correctly
  const users = await prisma.user.findMany({
    where: { OR: [{ defaultClips: 'pending' }, { defaultClips: { isSet: false } }] },
    include: { accounts: true }
  });
  return users;
};

type UserAccountWithUserIdAndSettings = UserWithAccountsAndSettingsWithId & { userId: string };
export const getUsersLatestsClips = async () => {
  try {
    return await prisma.user.findMany({
      where: {
        OR: [{ defaultClips: { in: ['complete', 'failed'] } }, { defaultClips: { isSet: false } }],
        settings: { lastUploaded: { not: null } }
      },
      include: { accounts: true, settings: true }
    });
  } catch (error) {
    log('error', 'getUsersLatestsClips Error', { error });
    return;
  }
};

export const getUsersWithUploadEnabled = async () => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId>('User');
  const users = (await db
    .aggregate([
      { $addFields: { userId: '$_id' } },
      {
        $lookup: {
          from: 'Setting',
          localField: '_id',
          foreignField: 'userId',
          as: 'settings',
          pipeline: [
            {
              $match: {
                uploadEnabled: true,
                scheduleDays: { $exists: true },
                timeOffset: { $exists: true }
              }
            }
          ]
        }
      },
      { $match: { settings: { $ne: [] } } }
    ])
    .toArray()) as UserAccountWithUserIdAndSettings[];
  return users;
};
