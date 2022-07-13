import cron from 'node-cron';
import axios from 'axios';

import {
  EVERY_10_SECONDS,
  EVERY_30_SECONDS,
  EVERY_MINUTE,
  EVERY_15_MINUTES,
  EVERY_30_MINUTES,
  EVERY_HOUR,
} from './scheduleConstants.js';

export default () => {
  cron.schedule(EVERY_15_MINUTES, async () => {
    const clipbotKey = process.env.APP_KEY;
    const res = await axios.get(`${process.env.CLIPBOT_URL}/api/clips/renderScheduledClips`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer: ${clipbotKey}` },
    });
    console.log(res.data);
  });
  cron.schedule(EVERY_15_MINUTES, async () => {
    const clipbotKey = process.env.APP_KEY;
    const res = await axios.get(`${process.env.CLIPBOT_URL}/api/clips/scheduled`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer: ${clipbotKey}` },
    });
    console.log(res.data);
  });
};
