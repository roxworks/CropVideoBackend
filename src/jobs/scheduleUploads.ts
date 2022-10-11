import cron from 'node-cron';
import axios from 'axios';

import {
  EVERY_10_SECONDS,
  EVERY_30_SECONDS,
  EVERY_MINUTE,
  EVERY_10_MINUTES,
  EVERY_15_MINUTES,
  EVERY_30_MINUTES,
  EVERY_HOUR
} from './cronConstants';
import { uploadClip } from '../service/uploadService';
import log from '../utils/logger';

export default () => {
  cron.schedule(EVERY_10_MINUTES, async () => {
    const clipbotKey = process.env.APP_KEY;
    try {
      const res = await axios.get(`${process.env.CLIPBOT_URL}/api/clips/renderScheduledClips`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer: ${clipbotKey}` }
      });
      log('info', 'schedule-cron', res.data);
    } catch (error) {
      log('error', 'Error getting clips to render');
      if (error instanceof Error) {
        log('error', 'render-clips', error.message);
      }
    }
  });

  cron.schedule(EVERY_15_MINUTES, async () => {
    try {
      const clips = await uploadClip();
      log('info', 'upload-cron upload clips', clips);
    } catch (error) {
      log('error', 'Something went wrong - upload cron');
      if (error instanceof Error) {
        log('error', 'upload-cron-error', error.message);
      }
    }
  });
};
