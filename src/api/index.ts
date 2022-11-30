import express, { Request, Response } from 'express';

import crop from './crop/crop.routes';
import user from './user/user.routes';
import schedule from './schedule/schedule.routes';
import { getUsersWithoutClips } from '../service/User';
// import queue from './queue/queue.routes';

const router = express.Router();

router.use('/crop', crop);
router.use('/schedule', schedule);
router.use('/user', user);

router.get('/delv-test', async (req: Request, res: Response) => {
  const users = await getUsersWithoutClips();
  res.json(users);
});

export default router;
