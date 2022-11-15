import { Queue, Worker } from 'bullmq';
import clipsProducer from '../workers/clips.worker';
import Redis from 'ioredis';
import { updateUserDefaultClipsById } from '../service/User';
import log from '../utils/logger';

const isDev = process.env.NODE_ENV === 'development';

const connectionURL = String(process.env.REDIS_URL!);

const connection = {
  host: 'localhost',
  port: 6379
};

export const clipQueue = new Queue('clips-all', {
  connection: isDev ? connection : new Redis(connectionURL, { maxRetriesPerRequest: null })
});

const myWroker = new Worker('clips-all', clipsProducer, {
  // connection: new Redis(connectionURL),
  connection: isDev ? connection : new Redis(connectionURL, { maxRetriesPerRequest: null }),
  concurrency: 1
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
  connection: isDev ? connection : new Redis(connectionURL, { maxRetriesPerRequest: null })
});

const clipLatestWroker = new Worker('clips-latest', clipsProducer, {
  // connection: new Redis(connectionURL),
  connection: isDev ? connection : new Redis(connectionURL, { maxRetriesPerRequest: null }),
  concurrency: 1
});

clipLatestWroker.on('completed', async (job) => {
  await updateUserDefaultClipsById(job.data.userId, 'complete');
  log('info', 'clip-queue-complete', { id: job.id, user: job.data.userId });
});

clipLatestWroker.on('failed', async (job, err) => {
  // await updateUserDefaultClipsById(job.data.userId, 'failed');
  log('error', 'clip-queue-failed', { id: job.id, user: job.data.userId, error: err });
});
