import { clipQueue } from '../../queues/clip.queue';

export const getAllUsersClips = async () => {
  try {
    console.log('Adding jobs...');
    for (let i = 0; i < 3; i++) {
      await clipQueue.add('my-job', { foo: 'bar' });
    }
    console.log('added clips');
  } catch (error) {
    console.log(error);
  }
};
