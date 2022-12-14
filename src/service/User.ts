import { DefaultClips } from '../api/user/user.model';
import prisma from '../db/conn';
import log from '../utils/logger';

export const getAllUsers = async () => prisma.user.findMany();

export const getUserById = async (id: string) => prisma.user.findUnique({ where: { id } });

export const updateUserDefaultClipsById = async (id: string, defaultClip: DefaultClips) =>
  prisma.user.update({ where: { id }, data: { defaultClips: defaultClip } });

export const getUserByIdWithAccountsAndSettings = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
        accounts: true,
      },
    });
    return user;
  } catch (error) {
    log('error', 'getUserByIdWithAccountsAndSettings', error);
    throw new Error(`failed getUserByIdWithAccountsAndSettings ${id} `);
  }
};

export const getUsersWithoutClips = async () => {
  const users = await prisma.user.findMany({
    where: { defaultClips: 'pending' },
    include: { accounts: true },
  });
  return users;
};

export const getUsersLatestsClips = async () => {
  try {
    return await prisma.user.findMany({
      where: {
        defaultClips: { in: ['complete', 'failed'] },
        settings: { lastUploaded: { not: null } },
      },
      include: { accounts: true, settings: true },
    });
  } catch (error) {
    log('error', 'getUsersLatestsClips Error', { error });
  }
};

export const getSettingsWithUploadEnabled = async () => {
  try {
    const user = await prisma.setting.findMany({
      where: {
        uploadEnabled: true,
        timeOffset: { not: null },
      },
      include: { user: true, ScheduledDays: true },
    });

    return user;
  } catch (error) {
    log('error', 'getUsersWithUploadEnabled Error', { error });
  }
};
