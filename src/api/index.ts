import express from 'express';

import crop from './crop/crop.routes';
import user from './user/user.routes';
import schedule from './schedule/schedule.routes';
// import queue from './queue/queue.routes';

const router = express.Router();

router.use('/crop', crop);
router.use('/schedule', schedule);
router.use('/user', user);

export default router;
