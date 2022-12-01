import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import clipsProducer from '../workers/clips.worker';
import { updateUserDefaultClipsById } from '../service/User';
import log from '../utils/logger';

const isDev = process.env.NODE_ENV === 'development';
export const RETRY_DELAY = 1000;
export const MAX_RETRIES = 3;

const connectionURL = String(process.env.REDIS_URL!);

const connection = {
  host: 'localhost',
  port: 6379,
};

export const clipQueue = new Queue('clips-all', {
  connection: isDev ? connection : new Redis(connectionURL, { maxRetriesPerRequest: null }),
  defaultJobOptions: {
    attempts: MAX_RETRIES,
    backoff: {
      type: 'exponential',
      delay: RETRY_DELAY,
    },
  },
});

const myWroker = new Worker('clips-all', clipsProducer, {
  // connection: new Redis(connectionURL),
  connection: isDev ? connection : new Redis(connectionURL, { maxRetriesPerRequest: null }),
  concurrency: 1,
});

myWroker.on('completed', async (job) => {
  await updateUserDefaultClipsById(job.data.userId, 'complete');
  log('info', 'clip-queue-complete', { id: job.id, user: job.data.userId });
});

myWroker.on('failed', async (job, err) => {
  await updateUserDefaultClipsById(job.data.userId, 'failed');
  log('error', 'clip-queue-failed', { id: job.id, user: job.data.userId, error: err });
});

export const clipLatestQueue = new Queue('clips-latest', {
  connection: isDev ? connection : new Redis(connectionURL, { maxRetriesPerRequest: null }),
  defaultJobOptions: {
    attempts: MAX_RETRIES,
    backoff: {
      type: 'exponential',
      delay: RETRY_DELAY,
    },
  },
});

const clipLatestWroker = new Worker('clips-latest', clipsProducer, {
  // connection: new Redis(connectionURL),
  connection: isDev ? connection : new Redis(connectionURL, { maxRetriesPerRequest: null }),
  concurrency: 2,
});

clipLatestWroker.on('completed', async (job) => {
  await updateUserDefaultClipsById(job.data.userId, 'complete');
  log('info', 'clip-queue-complete', { id: job.id, user: job.data.userId });
});

clipLatestWroker.on('failed', async (job: Job, err) => {
  if (job.opts.attempts === MAX_RETRIES) {
    log('error', 'clip-queue-failed-max-retries', {
      id: job.id,
      user: job.data.userId,
      error: err,
    });
    // await updateUserDefaultClipsById(job.data.userId, 'failed');
  }
  log('error', 'clip-queue-failed', { id: job.id, user: job.data.userId, error: err });
});
