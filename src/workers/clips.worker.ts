import { Job } from 'bullmq';
import { updateLastUploadDate } from '../service/Settings';
import { getUserByIdWithAccountsAndSettings } from '../service/User';
import { getClipsStartingAtCertainDateFromTwitchAPI } from '../utils/twitch/clips.handler';
import { bulkSaveTwitchClips, saveTwitchClips } from '../service/TwitchClip';
import log from '../utils/logger';

const clipsProducer = async (job: Job<{ userId: string; providerAccountId: string }, any, any>) => {
  log('info', 'clip-producer start ', job.data, 'clips.worker');
  const userId = job.data.userId;
  // throw new Error('whoops');
  //TODO:: gets users clips - add to clips handler
  try {
    const user = await getUserByIdWithAccountsAndSettings(userId);
    const userSettings = user.settings[0];
    if (!user) throw Error(`unable to find user ${userId}`);
    // get twitch account
    const twitchProvider = user.accounts?.filter((acc) => acc.provider === 'twitch')[0];

    if (!twitchProvider || !twitchProvider.providerAccountId || !twitchProvider.access_token)
      throw Error('missing information');

    let clips = await getClipsStartingAtCertainDateFromTwitchAPI(
      twitchProvider.providerAccountId,
      user
    );

    if (!clips || clips.length === 0) return;
    await bulkSaveTwitchClips(clips);
    const lastUpload = clips[clips.length - 1];
    await updateLastUploadDate(userId, new Date(lastUpload.created_at), lastUpload.id);
  } catch (err) {
    log('error', 'clips-producer failed to get clips', err, 'clips.worker');
    if (err instanceof Error) {
      log('error', 'clips=producer', err.message);
    }
    throw new Error('somethiing went wrong getting all clips');
  }
};

export default clipsProducer;
