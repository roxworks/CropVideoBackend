import { Queue, Worker } from 'bullmq';
import clipsProducer from '../workers/clips.worker';

import Redis from 'ioredis';

//todo: create redis server on railway
// const connectionURL = String(process.env.REDIS_URL!);
// console.log(connectionURL);

const connection = {
  host: 'localhost',
  port: 6379,
};

export const clipQueue = new Queue('clips-all', {
  // connection: new Redis(connectionURL),
  connection,
});

const myWroker = new Worker('clips-all', clipsProducer, {
  // connection: new Redis(connectionURL),
  connection,
  concurrency: 1,
});

const getAllUsersClips = async (data: any) => {
  try {
    console.log('Adding jobs...');
    for (let i = 0; i < 3; i++) {
      await clipQueue.add('my-job', { foo: 'bar' });
    }
    console.log('added clips');
    await clipQueue.close();
  } catch (error) {
    console.log(error);
  }
};

myWroker.on('completed', (job) => {
  console.log(`${job.id} has completed!`);
});

myWroker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});

export default getAllUsersClips;
