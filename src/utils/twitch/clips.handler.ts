import { clipQueue } from '../../queues/clip.queue';

export const testAddToClipQueue = async () => {
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

export const addToGetAllClipsQueue = async (userId: string, broadcasterId: string) => {
  try {
    await clipQueue.add('getAll', { userId, broadcasterId });
    console.log('getAllClips queue user: ', userId, broadcasterId);
  } catch (error) {
    console.log(error);
  }
};
