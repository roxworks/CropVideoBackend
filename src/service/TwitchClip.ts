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
    log('warn', 'unable to save clips - not found', undefined, 'bulkSaveTwitchClips');
    return;
  }
  // TODO:: when change to postgress use skipDuplicates
  // await prisma.twitchClip.createMany({ data: [], skipDuplicates: true });
  // const bulk_ops_arr = [];

  // for (const clip of clips) {
  //   //check to see if clip is in db

  //   //if not create
  //   const update = prisma.twitchClip.upsert({
  //     where: { userId_twitch_id: { userId: clip.userId, twitch_id: clip.twitch_id } },
  //     update: clip,
  //     create: clip,
  //   });
  //   bulk_ops_arr.push(update);
  // }

  const bulked = await prisma.twitchClip.createMany({ data: clips });

  log('info', 'clips updated', bulked, 'bulkSaveTwitchClips');
  return bulked;
};
