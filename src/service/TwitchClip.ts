import { ClipManualWithUserId } from '../api/crop/crop.model';
import log from '../utils/logger';
import { TSettings } from '../interfaces/Settings';
import prisma from '../db/conn';

export const autoApproveClips = async (settings: TSettings) => {
  if (!settings.approveDate && !settings.approveDate) return;

  const updatedClips = await prisma.twitchClip.updateMany({
    where: {
      userId: settings.userId.toString(),
      view_count: { gte: settings.minViewCount },
      created_at: { gte: settings.approveDate.toISOString() },
      AND: [
        { OR: [{ approved: false }, { approved: { isSet: false } }] },
        { OR: [{ approvedStatus: { not: 'CANCELED' } }, { approvedStatus: { isSet: false } }] }
      ]
    },
    data: { approved: true, approvedStatus: 'AUTO_APPROVE' }
  });

  return updatedClips;
};

export const bulkSaveTwitchClips = async (clips: ClipManualWithUserId[]) => {
  if (!clips) {
    log('warn', 'unable to save clips - not found', undefined, 'bulkSaveTwitchClips');
    return;
  }
  //TODO:: when change to postgress use skipDuplicates
  // await prisma.twitchClip.createMany({ data: [], skipDuplicates: true });

  const bulked = await prisma.twitchClip.createMany({ data: clips });

  log('info', 'clips updated', bulked, 'bulkSaveTwitchClips');
  return bulked;
};
