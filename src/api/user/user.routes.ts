import { Router } from 'express';
import { validateRequest } from '../../middlewares';
import { NewUserQueueReq } from './user.model';
import addToDefaultClipQueue from './user.handler';

const router = Router();

router.post('/newUserQueue', validateRequest({ body: NewUserQueueReq }), addToDefaultClipQueue);

export default router;
