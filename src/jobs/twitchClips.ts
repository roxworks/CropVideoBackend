import cron from 'node-cron';
import axios from 'axios';

import { EVERY_10_SECONDS } from './cronConstants';
import { getAllUsersClips } from '../utils/twitch/clips.handler';

export default () => {
  cron.schedule(EVERY_10_SECONDS, async () => {
    try {
      await getAllUsersClips();
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      }
    }
  });
};
