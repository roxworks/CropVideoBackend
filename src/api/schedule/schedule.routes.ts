import { Router } from 'express';
import { validateRequest } from '../../middlewares';
import * as ScheduleHandler from './schedule.handler';
import { ScheduledClipsArray } from './schedule.model';

const router = Router();

router.post('/', validateRequest({ body: ScheduledClipsArray }), ScheduleHandler.scheduleJobs);
router.get('/', ScheduleHandler.jobsList);

export default router;
