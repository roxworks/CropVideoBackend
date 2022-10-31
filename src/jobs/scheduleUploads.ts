import cron from 'node-cron';
import axios from 'axios';

import { EVERY_10_MINUTES, EVERY_15_MINUTES, EVERY_30_MINUTES } from './cronConstants';
import { uploadClip } from '../service/uploadService';
import log from '../utils/logger';
import { autoScheduleClips } from '../utils/scheduleUtil';

export default () => {
  // get clips to render
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
  // upload clips that have been rednered
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
  // upload clips that have been rednered
  cron.schedule(EVERY_30_MINUTES, async () => {
    try {
      log('info', 'auto schedule');
      const users = await autoScheduleClips();
      log('info', 'auto schedule clips cron', users);
    } catch (error) {
      log('error', 'Something went wrong - auto schedule clips');
      if (error instanceof Error) {
        log('error', 'auto-schedule-clips', error.message);
      }
    }
  });
};
