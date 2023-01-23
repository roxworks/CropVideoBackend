import { Response, Request } from 'express';
import log from '../../utils/logger';
import { NewUserQueueReq } from './user.model';
import { addToGetAllClipsQueue } from '../../utils/twitch/clips.handler';

const addToDefaultClipQueue = async (req: Request<{}, {}, NewUserQueueReq>, res: Response) => {
  if (!req.headers.authorization) return res.status(400).send();
  const { APP_KEY } = process.env;
  if (!APP_KEY) return res.status(500).send('internal server error');
  const ACTION_KEY = req.headers.authorization.split(' ')[1];
  if (ACTION_KEY !== APP_KEY) return res.status(400).send();

  const { userId, broadcasterId } = req.body;
  log('info', 'req body', req.body, 'user.handler');

  addToGetAllClipsQueue(userId, broadcasterId);

  return res.status(200).end();
};

export default addToDefaultClipQueue;
