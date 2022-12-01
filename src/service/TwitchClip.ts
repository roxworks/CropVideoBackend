import { SettingsOutput, TSettings } from '../interfaces/Settings';
import { ClipManualWithUserId } from '../api/crop/crop.model';
import log from '../utils/logger';
import prisma from '../db/conn';

export const autoApproveClips = async (settings: TSettings | SettingsOutput) => {
  if (!settings.approveDate && !settings.approveDate) return;

  const updatedClips = await prisma.twitchClip.updateMany({
    where: {
      userId: settings.userId.toString(),
      view_count: { gte: settings.minViewCount },
      created_at: { gte: settings.approveDate.toISOString() },
      AND: [
        { OR: [{ approved: false }, { approved: { isSet: false } }] },
        { OR: [{ approvedStatus: { not: 'CANCELED' } }, { approvedStatus: { isSet: false } }] },
      ],
    },
    data: { approved: true, approvedStatus: 'AUTO_APPROVE' },
  });

  return updatedClips;
};

export const bulkSaveTwitchClips = async (clips: ClipManualWithUserId[]) => {
  if (!clips) {
    return;
  }
  // TODO:: when change to postgress use skipDuplicates
  // await prisma.twitchClip.createMany({ data: [], skipDuplicates: true });
  const bulked = await prisma.twitchClip.createMany({ data: clips });

  log('info', 'clips updated', bulked, 'bulkSaveTwitchClips');
  return bulked;
};

export const isClipInDB = async <T extends { userId: string; twitch_id: string }>(clip: T) => {
  const hasClip = await prisma.twitchClip.findUnique({
    where: {
      userId_twitch_id: {
        userId: clip.userId,
        twitch_id: clip.twitch_id,
      },
    },
  });
  if (hasClip) {
    return true;
  }
  return false;
};
