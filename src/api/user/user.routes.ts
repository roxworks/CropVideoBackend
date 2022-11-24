import { Router } from 'express';
import { validateRequest } from '../../middlewares';
import { NewUserQueueReq } from './user.model';
import * as UserHandler from './user.handler';

const router = Router();

router.post(
  '/newUserQueue',
  validateRequest({ body: NewUserQueueReq }),
  UserHandler.addToDefaultClipQueue
);

export default router;
