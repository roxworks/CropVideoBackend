/* eslint-disable no-await-in-loop */
import { TCropType, getCropTemplateByType } from '../service/CropTemplate';
import { getUsersApprovedClips, scheduleClips, scheduledClipsFromTime } from '../service/Clip';
import { updateScheduledEnabled } from '../service/Settings';
import { getSettingsWithUploadEnabled } from '../service/User';
import log from './logger';
import { SettingsWithUser } from '../interfaces/Settings';

export type ScheduleDays = {
  [key: string]: string[];
};

// convert users schedule days to UTC days using their offset
// Examples - start:
// {
//   sun: ['11:45', '00:15'],
//   mon: [ '0:15', '17:00' ],
//   tue: [ '0:15', '17:15' ],
//   wed: [ '17:00' ],
//   thu: [],
//   fri: [],
//   sat: ['11:45']
// }
// OFFSERT -60
// returns
// {
//   sun: ['10:45','23:15', '00:45'],
//   mon: ['16:00', '23:15'],
//   tue: ['16:15'],
//   wed: ['16:00'],
//   thu: [],
//   fri: [],
//   sat: ['23:15']
// }

export const scheduleByUTCDay = (scheduleDays: ScheduleDays, UTCoffset: number) => {
  const LOOKUP_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const newDays: ScheduleDays = {
    sun: [],
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
  };
  Object.keys(scheduleDays).forEach((key, index) => {
    scheduleDays[key].forEach((time) => {
      const newTime = convertTime(time, UTCoffset);
      if (newTime.offsetDay === 0) {
        newDays[key].push(newTime.time);
      } else if (newTime.offsetDay < 0) {
        const day = LOOKUP_DAYS.slice(index - Math.abs(newTime.offsetDay));

        newDays[day[0]].push(newTime.time);
      } else {
        const day = (index + newTime.offsetDay) % 7;

        newDays[LOOKUP_DAYS[day]].push(newTime.time);
      }
    });
  });

  return newDays;
};

export const convertTime = (time: string, offset: number) => {
  const [hours, mins] = time.split(':');
  const today = new Date().setHours(+hours, +mins, 0, 0);
  const todaysDay = new Date(today).getDay();
  let newOffset: number;

  if (offset < 0) {
    newOffset = today - 1000 * 60 * Math.abs(offset);
  } else {
    newOffset = today + 1000 * 60 * offset;
  }

  const offsetTime = new Date(newOffset);
  const dayAfter = offsetTime.getDay();

  return {
    offsetDay: dayAfter - todaysDay,
    time: `${offsetTime.getHours()}:${offsetTime.getMinutes()}`,
  };
};

export const autoScheduleClips = async () => {
  const LOOKUP_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const settingsWithUploadEnabled = await getSettingsWithUploadEnabled();
  if (!settingsWithUploadEnabled) return;

  for (const settings of settingsWithUploadEnabled) {
    // check if the users is subbed
    const isSubbed = settings.user.sub_status === 'active';
    // if not subbed set scheduledEnabled to false
    if (!isSubbed) {
      // eslint-disable-next-line no-await-in-loop
      await updateScheduledEnabled(settings.id.toString());
      // TODO:: email client to notfiy sccheduled uploads have been turned off
      continue;
    }
    // check if the user has scheduled days
    const userSettings = settings as SettingsWithUser;
    if (!userSettings?.cropType) continue;

    log('info', 'auto schedule - got user settings', settings.user.name);

    const cropType = userSettings.cropType as TCropType;

    const cropTemplate = await getCropTemplateByType(settings.user.id.toString(), cropType);
    if (!cropTemplate) continue;

    log('info', 'auto schedule - got user templates', cropTemplate);

    const scheduleDays = userSettings.scheduleDays as ScheduleDays;
    const { timeOffset } = userSettings;

    if (!scheduleDays || timeOffset === null || timeOffset === undefined) continue;

    log('info', 'auto schedule - schduledays', scheduleDays);
    let hasSchuldeDays = false;
    for (const key in scheduleDays) {
      if (scheduleDays[key].length !== 0) {
        hasSchuldeDays = true;
        break;
      }
    }

    log('info', 'auto schedule - hasSchuldeDays', hasSchuldeDays);
    if (!hasSchuldeDays) continue;

    // check if user has approved clips
    const approvedClips = await getUsersApprovedClips(settings.user.id.toString());

    const approvedClipsCount = approvedClips.length;

    log('info', 'auto schedule - approve clips', approvedClips);
    if (approvedClipsCount === 0) continue;

    // schedule days into UTC days
    const UTCDays = scheduleByUTCDay(scheduleDays, timeOffset);
    log('info', 'User UTC days', settings.user.name);
    // is there any schedules for today.
    const today = new Date();
    const todaysSchedule = UTCDays[LOOKUP_DAYS[today.getUTCDay()]];
    if (todaysSchedule.length === 0) continue;

    // for each time check if they have a scheduled clip already
    for (const time of todaysSchedule) {
      if (approvedClips.length === 0) break;
      const [hours, mins] = time.split(':');
      const date = new Date().setUTCHours(+hours, +mins, 0, 0);
      const scheduleTime = new Date(date).toISOString();
      // check time is greater then now
      const isGreaterThanNow = scheduleTime > today.toISOString();
      if (!isGreaterThanNow) continue;

      const scheduledClips = await scheduledClipsFromTime(
        settings.user.id.toString(),
        scheduleTime
      );
      if (scheduledClips.count > 0) continue;
      // if not a scheduled clip, add one

      await scheduleClips(approvedClips.shift()!, scheduleTime, userSettings, cropTemplate);
    }
    const tommorrowDay = (today.getUTCDay() + 1) % 7;
    const midNightCheck = UTCDays[LOOKUP_DAYS[tommorrowDay]];
    const hoursSet = new Date().setUTCHours(1, 0, 0, 0);
    const setDay = new Date(hoursSet).setUTCDate(new Date(hoursSet).getUTCDate() + 1);
    const nextDayMidnight = new Date(setDay);

    for (const time of midNightCheck) {
      if (approvedClips.length === 0) break;
      const [hours, mins] = time.split(':');
      const date = new Date(nextDayMidnight).setUTCHours(+hours, +mins, 0, 0);
      const scheduleTime = new Date(date).toISOString();
      if (scheduleTime > nextDayMidnight.toISOString()) continue;

      const scheduledClips = await scheduledClipsFromTime(
        settings.user.id.toString(),
        scheduleTime
      );
      if (scheduledClips.count > 0) continue;
      await scheduleClips(approvedClips.shift()!, scheduleTime, userSettings, cropTemplate);
    }
  }
  return settingsWithUploadEnabled.length;
};
