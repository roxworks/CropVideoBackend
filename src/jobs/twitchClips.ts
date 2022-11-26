import cron from 'node-cron';

import { EVERY_MINUTE, EVERY_10_MINUTES } from './cronConstants';
import { addToGetAllClipsQueue, addToGetLatestClipsQueue } from '../utils/twitch/clips.handler';
import {
  getUsersLatestsClips,
  getUsersWithoutClips,
  updateUserDefaultClipsById
} from '../service/User';
import log from '../utils/logger';

export default () => {
  cron.schedule(EVERY_MINUTE, async () => {
    try {
      //get all users where defaultClips is false or null
      const users = await getUsersWithoutClips();
      if (!users || users.length === 0) {
        log('info', 'cron-default-clips', 'No users without default clips');
        return;
      }
      // add users to clipqueue
      for (const user of users) {
        const twitchProvider = user.accounts?.filter((acc) => acc.provider === 'twitch')[0];
        if (!twitchProvider.providerAccountId) return;

        addToGetAllClipsQueue(user.id, twitchProvider.providerAccountId);
      }
    } catch (error) {
      if (error instanceof Error) {
        log('error', 'cron-default-clips', error.message);
      }
    }
  });
  cron.schedule(EVERY_10_MINUTES, async () => {
    try {
      // get list of users with lastUploaded date to fetch new clips
      const users = await getUsersLatestsClips();
      log('info', 'cron-latest-clips', users?.length || 0);
      if (!users) return;
      // add users to latest clip queue
      for (const user of users) {
        const twitchProvider = user.accounts?.filter((acc) => acc.provider === 'twitch')[0];
        if (!twitchProvider.providerAccountId) return;

        addToGetLatestClipsQueue(user.id, twitchProvider.providerAccountId);
      }
    } catch (error) {
      log('error', 'cron-latest-clips');
      if (error instanceof Error) {
        log('error', 'cron-latest-clips', error.message);
      }
    }
  });
};
