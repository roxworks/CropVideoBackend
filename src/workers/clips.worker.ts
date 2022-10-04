import { Job } from 'bullmq';
import { getUserByIdWithAccountsAndSettings } from '../service/User';
import { getUsersTwitchAccount } from '../service/Account';

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const clipsProducer = async (job: Job<{ userId: string; providerAccountId: string }, any, any>) => {
  console.log('clip producer: ', job.data);
  const userId = job.data.userId;
  // throw new Error('whoops');
  //TODO:: gets users clips - add to clips handler
  const user = await getUserByIdWithAccountsAndSettings(userId);
  console.log('user:', user)
  if (!user) throw Error(`unable to find user ${userId}`);
  // get twitch account
  const twitchProvider = user.accounts?.filter((acc) => acc.provider === 'twitch')[0];

  if (!twitchProvider.providerAccountId && !twitchProvider.access_token)
    throw Error('missing information');
  //TODO get twitch clip
  const twitch = await getUsersTwitchAccount(userId);
  console.log('getUsersTwitchAccount:', twitch);
  console.log('----compare---', twitchProvider);


  await updateTest(job.id!);
};

const updateTest = async (id: string) => {
  await timeout(1000);
  console.log('Done', id);
};

export default clipsProducer;
