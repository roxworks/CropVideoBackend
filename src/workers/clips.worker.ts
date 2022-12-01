import { Job } from 'bullmq';
import { updateLastUploadDate } from '../service/Settings';
import { getUserByIdWithAccountsAndSettings } from '../service/User';
import { getClipsStartingAtCertainDateFromTwitchAPI } from '../utils/twitch/clips.handler';
import { autoApproveClips, bulkSaveTwitchClips, isClipInDB } from '../service/TwitchClip';
import log from '../utils/logger';

const clipsProducer = async (job: Job<{ userId: string; providerAccountId: string }, any, any>) => {
  log('info', 'clip-producer start ', job.data, 'clips.worker');
  const { userId } = job.data;

  // throw new Error('whoops');

  try {
    const user = await getUserByIdWithAccountsAndSettings(userId);
    const userSettings = user?.settings;
    if (!user && !userSettings) {
      log('error', 'getUserByIdWithAccountsAndSettings - user', userId);
      throw Error(`unable to find user ${userId}`);
    }
    // get twitch account
    const twitchProvider = user.accounts?.filter((acc) => acc.provider === 'twitch')[0];

    if (!twitchProvider || !twitchProvider.providerAccountId || !twitchProvider.access_token) {
      log('error', 'getUserByIdWithAccountsAndSettings - missing info', {
        provider: Boolean(twitchProvider),
        providerAccountId: Boolean(twitchProvider.providerAccountId),
        access_token: Boolean(twitchProvider.access_token),
      });
      throw Error('missing information');
    }

    let clips = await getClipsStartingAtCertainDateFromTwitchAPI(
      twitchProvider.providerAccountId,
      user
    );

    if (!clips || clips.length === 0) {
      return {
        name: user.name,
        broadcasterId: job.data.providerAccountId,
        clipsCount: clips.length,
        autoApprove: userSettings?.defaultApprove,
      };
    }

    // check if auto approve is on
    if (userSettings?.defaultApprove) {
      await autoApproveClips(userSettings);
    }

    if (clips.length === 1) {
      const lastUploadedClip = userSettings?.lastUploadedId;
      if (lastUploadedClip === clips[0].twitch_id) {
        return {
          name: user.name,
          broadcasterId: job.data.providerAccountId,
          clipsCount: clips.length,
          autoApprove: userSettings?.defaultApprove,
        };
      }
    }

    // remove lastUploadedId - to stop duplicated uploads as mongo doesnt allow skipDuplicated check on createMany in bulkSaveTwitchClips
    if (userSettings?.lastUploadedId) {
      // clips = clips.filter((clip) => clip.twitch_id !== userSettings.lastUploadedId);
      const results = await Promise.all(clips.map((clip) => isClipInDB(clip)));
      const clipsInDb = [];
      for (let i = 0; i < clips.length; i++) {
        if (!results[i]) {
          clipsInDb.push(clips[i]);
        }
      }
      if (clipsInDb.length === 0) {
        return {
          name: user.name,
          broadcasterId: job.data.providerAccountId,
          clipsCount: clipsInDb.length,
          autoApprove: userSettings?.defaultApprove,
        };
      }
      clips = clipsInDb;
    }
    await bulkSaveTwitchClips(clips);
    const lastUpload = clips[clips.length - 1];
    await updateLastUploadDate(userId, new Date(lastUpload.created_at), lastUpload.twitch_id);

    return {
      name: user.name,
      broadcasterId: job.data.providerAccountId,
      clipsCount: clips.length,
      autoApprove: userSettings?.defaultApprove,
    };
  } catch (err) {
    log('error', 'clips-producer failed to get clips', err, 'clips.worker');
    if (err instanceof Error) {
      log('error', 'clips-producer', err.message);
      log('error', 'clips-producer', err);
    }
    throw new Error('somethiing went wrong getting all clips');
  }
};

export default clipsProducer;
