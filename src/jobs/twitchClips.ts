import cron from 'node-cron';

import { EVERY_MINUTE } from './cronConstants';
import { addToGetAllClipsQueue } from '../utils/twitch/clips.handler';
import { getUsersWithoutClips } from '../service/User';

export default () => {
  cron.schedule(EVERY_MINUTE, async () => {
    try {
      //get all users where defaultClips is false or null
      const users = await getUsersWithoutClips();
      if (users.length === 0) {
        console.log('No users without default clips');
        return;
      }
      // add users to clipqueue
      users.forEach((user) => {
        const twitchProvider = user.accounts?.filter((acc) => acc.provider === 'twitch')[0];
        if (!twitchProvider.providerAccountId) return;
        addToGetAllClipsQueue(user.userId, twitchProvider.providerAccountId);
      });
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      }
    }
  });
};
