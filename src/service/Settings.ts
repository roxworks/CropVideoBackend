import { Setting } from '@prisma/client';
import prisma from '../db/conn';
import log from '../utils/logger';

export const updateLastUploadDate = async (
  userId: string,
  lastUploaded: Date,
  lastUploadedId: string
) => {
  try {
    const updatedUserSettings = await prisma.setting.update({
      where: { userId },
      data: { lastUploaded, lastUploadedId },
    });

    return updatedUserSettings;
  } catch (error) {
    log('error', 'updateLastUploadDate Error', { error, userId, lastUploadedId });
    return {} as Setting;
  }
};

export const getUsersSettingsById = async (userId: string) => {
  try {
    const userSettings = await prisma.setting.findUniqueOrThrow({
      where: { userId },
    });

    return userSettings;
  } catch (error) {
    log('error', 'getUsersSettingsById Error', { error, userId });
  }
};
export const updateScheduledEnabled = async (
  userId: string,
  uploadEnabled = false,
  autoCaption = false
) => {
  try {
    const updatedUserSettings = await prisma.setting.update({
      where: { userId },
      data: { uploadEnabled, autoCaption },
    });

    return updatedUserSettings;
  } catch (error) {
    log('error', 'updateScheduledEnabled Error', { error, userId });
  }
};
