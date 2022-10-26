import log from './logger';

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
//OFFSERT -60
//returns
// {
//   sun: ['10:45','23:15', '00:45'],
//   mon: ['16:00', '23:15'],
//   tue: ['16:15'],
//   wed: ['16:00'],
//   thu: [],
//   fri: [],
//   sat: ['23:15']
// }

const convertStringDate = (time: string, offset: number) => {
  const paddedTime = time.replace(':', '').padStart(4, '0');
  if (offset > 0) {
    return Number(paddedTime) + offset;
  }

  return Number(paddedTime) - Math.abs(offset);
};

export const scheduleByUTCDay = (scheduleDays: ScheduleDays, UTCoffset: number) => {
  const LOOKUP_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  console.log('scheduleByUTCDays');
  const newDays: ScheduleDays = {
    sun: [],
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: []
  };
  Object.keys(scheduleDays).forEach((key, index) => {
    scheduleDays[key].forEach((time) => {
      const newTime = convertTime(time, UTCoffset);
      if (newTime.offsetDay === 0) {
        newDays[key].push(newTime.time);
      } else {
        if (newTime.offsetDay < 0) {
          let day = LOOKUP_DAYS.slice(index - Math.abs(newTime.offsetDay));

          newDays[day[0]].push(newTime.time);
        } else {
          const day = (index + newTime.offsetDay) % 7;
          console.log({ day });

          newDays[LOOKUP_DAYS[day]].push(newTime.time);
        }
      }
    });
  });
  log('info', 'UTC Schedule', { userDays: scheduleDays, UTCDays: newDays });

  return newDays;
};

const convertTime = (time: string, offset: number) => {
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
    time: `${offsetTime.getHours()}:${offsetTime.getMinutes()}`
  };
};
