import cron from 'node-cron';
import axios from 'axios';

import {
  EVERY_10_SECONDS,
  EVERY_30_SECONDS,
  EVERY_MINUTE,
  EVERY_10_MINUTES,
  EVERY_15_MINUTES,
  EVERY_30_MINUTES,
  EVERY_HOUR,
} from './scheduleConstants.js';
import { uploadClip } from '../service/uploadService.js';

export default () => {
  cron.schedule(EVERY_10_MINUTES, async () => {
    const clipbotKey = process.env.APP_KEY;
    try {
      const res = await axios.get(`${process.env.CLIPBOT_URL}/api/clips/renderScheduledClips`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer: ${clipbotKey}` },
      });
      console.log(res.data);
    } catch (error) {
      console.log('Error getting clips to render');
      console.log(error.message);
    }
  });
  // cron.schedule(EVERY_15_MINUTES, async () => {
  //   const clipbotKey = process.env.APP_KEY;
  //   try {
  //     const res = await axios.get(`${process.env.CLIPBOT_URL}/api/clips/scheduled`, {
  //       headers: { 'Content-Type': 'application/json', Authorization: `Bearer: ${clipbotKey}` },
  //     });
  //     console.log(res.data);
  //   } catch (error) {
  //     console.log('Error getting clips to upload');
  //     console.log(error.message);
  //   }
  // });

  cron.schedule(EVERY_15_MINUTES, async () => {
    try {
      const clips = await uploadClip();
    } catch (error) {
      console.log('Something went wrong - upload cron');
      console.log(error.message);
    }
  });
};
