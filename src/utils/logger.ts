import { hideTokens } from './hideTokens';
import throttledQueue from 'throttled-queue';
import axios from 'axios';

type LOGGER_LEVELS = 'error' | 'info' | 'warn';

export const throttle = throttledQueue(20, 2000);

const log = async (level: LOGGER_LEVELS, message: string, data?: any, location?: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(level, message, data);
    return;
  }

  const logData = {
    time: new Date().toISOString(),
    level: level.toUpperCase(),
    location: location ? location : 'server',
    message,
    // If data is from http middleware allow those fields, stringify objects/arrays, pass strings and numbers
    data:
      location === 'http'
        ? data
        : typeof data === 'object'
        ? JSON.stringify(hideTokens(data))
        : data
  };

  throttle(async () => {
    console.log('throttling logs');
    const url = process.env.AXIOM_URL;
    return axios
      .post(url!, JSON.stringify([logData]), {
        headers: {
          Authorization: `Bearer ${process.env.AXIOM_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })
      .then((res) => {
        console.log('log sent');
        if (res.status === 429) {
          console.log('sending to many logs, addng logs to queue');
          return;
        }
      })
      .catch((err) => {
        console.log('error sending log', err);
      });
  });
};

export default log;
