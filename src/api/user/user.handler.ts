import { Response, Request, NextFunction } from 'express';
import log from '../../utils/logger';
import { NewUserQueueReq } from './user.model';
import { addToGetAllClipsQueue } from '../../utils/twitch/clips.handler';

export const addToDefaultClipQueue = async (
  req: Request<{}, {}, NewUserQueueReq>,
  res: Response,
  next: NextFunction
) => {
  if (!req.headers.authorization) return res.status(400).send();
  const { APP_KEY } = process.env;
  if (!APP_KEY) return res.status(500).send('internal server error');
  const ACTION_KEY = req.headers.authorization.split(' ')[1];
  if (ACTION_KEY !== APP_KEY) return res.status(400).send();

  const { userId, broadcasterId } = req.body;
  log('info', 'req body', req.body, 'user.handler');

  addToGetAllClipsQueue(userId, broadcasterId);

  res.status(200).end();
};
