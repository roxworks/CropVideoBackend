import express from 'express';
import { scheduleJobs, jobsList } from '../controller/scheduleController.js';

const router = express.Router();

router.route('/').post(scheduleJobs);
router.route('/').get(jobsList);

export default router;
