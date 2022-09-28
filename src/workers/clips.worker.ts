import { Job } from 'bullmq';

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const clipsProducer = async (job: Job) => {
  console.log('clip producer: ', job.data);
  // throw new Error('whoops');

  await updateTest(job.id!);
};

const updateTest = async (id: string) => {
  await timeout(2000);
  console.log('Done', id);
};

export default clipsProducer;
