import { Job } from 'bullmq';
import { getUserByIdWithAccountsAndSettings } from '../service/User';
import { getClipsStartingAtCertainDateFromTwitchAPI } from '../utils/twitch/clips.handler';

const clipsProducer = async (job: Job<{ userId: string; providerAccountId: string }, any, any>) => {
  console.log('clip producer: ', job.data);
  const userId = job.data.userId;
  // throw new Error('whoops');
  //TODO:: gets users clips - add to clips handler
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
  console.log('clips length: ', clips.length);
};

export default clipsProducer;
