import { Job } from 'bullmq';
import { updateLastUploadDate } from '../service/Settings';
import { getUserByIdWithAccountsAndSettings } from '../service/User';
import { getClipsStartingAtCertainDateFromTwitchAPI } from '../utils/twitch/clips.handler';

const clipsProducer = async (job: Job<{ userId: string; providerAccountId: string }, any, any>) => {
  console.log('clip producer: ', job.data);
  const userId = job.data.userId;
  // throw new Error('whoops');
  //TODO:: gets users clips - add to clips handler
  try {
    const user = await getUserByIdWithAccountsAndSettings(userId);
    console.log('user:', user);
    if (!user) throw Error(`unable to find user ${userId}`);
    // get twitch account
    const twitchProvider = user.accounts?.filter((acc) => acc.provider === 'twitch')[0];

    if (!twitchProvider || !twitchProvider.providerAccountId || !twitchProvider.access_token)
      throw Error('missing information');
    //TODO get titch cli
    const clips = await getClipsStartingAtCertainDateFromTwitchAPI(
      twitchProvider.providerAccountId,
      user
    );
    const lastUpload = clips[0];
    const settingsUpdated = await updateLastUploadDate(userId, new Date(lastUpload.created_at));
  } catch (err) {
    console.log('something went wrong getting all clips');
    if (err instanceof Error) {
      console.log(err.message);
    }
  }
};

export default clipsProducer;
