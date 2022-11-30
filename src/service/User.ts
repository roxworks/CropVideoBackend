import { DefaultClips } from '../api/user/user.model';
import prisma from '../db/conn';
import log from '../utils/logger';

export const getAllUsers = async () => prisma.user.findMany();

export const getUserById = async (id: string) => prisma.user.findUnique({ where: { id } });

export const updateUserDefaultClipsById = async (id: string, defaultClip: DefaultClips) =>
  prisma.user.update({ where: { id }, data: { defaultClips: defaultClip } });

export const getUserByIdWithAccountsAndSettings = async (id: string) => {
  const user = prisma.user.findUnique({
    where: { id },
    include: {
      settings: true,
      accounts: true,
    },
  });
  return user;
};

export const getUsersWithoutClips = async () => {
  // TODO:: does this include accounts correctly
  const users = await prisma.user.findMany({
    where: { OR: [{ defaultClips: 'pending' }, { defaultClips: { isSet: false } }] },
    include: { accounts: true },
  });
  return users;
};

export const getUsersLatestsClips = async () => {
  try {
    return await prisma.user.findMany({
      where: {
        OR: [{ defaultClips: { in: ['complete', 'failed'] } }, { defaultClips: { isSet: false } }],
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
        scheduleDays: { isSet: true },
        timeOffset: { isSet: true },
      },
      include: { user: true },
    });

    return user;
  } catch (error) {
    log('error', 'getUsersWithUploadEnabled Error', { error });
  }
};
