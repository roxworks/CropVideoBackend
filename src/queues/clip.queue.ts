import { Queue, Worker } from 'bullmq';
import clipsProducer from '../workers/clips.worker';
import Redis from 'ioredis';
import { updateUserDefaultClipsById } from '../service/User';

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
  console.log(`${job.id} has completed!`);
});

myWroker.on('failed', async (job, err) => {
  await updateUserDefaultClipsById(job.data.userId, 'failed');
  console.log(`${job.id} has failed with ${err.message}`);
});
