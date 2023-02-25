import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { path } from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import * as middlewares from './middlewares';
import api from './api';

import scheduledFunctions from './jobs/scheduleUploads';
import twitchClipsCrons from './jobs/twitchClips';
ffmpeg.setFfmpegPath(path);
// @ts-ignore
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import MessageResponse from './interfaces/MessageResponse';
import { clipLatestQueue, clipQueue } from './queues/clip.queue';
import log from './utils/logger';
ffmpeg.setFfprobePath(ffprobePath);

const app = express();
const PORT = process.env.PORT || 5000;

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(clipQueue, { readOnlyMode: true }),
    new BullMQAdapter(clipLatestQueue, { readOnlyMode: true }),
  ],
  serverAdapter: serverAdapter,
});

// cron jobs
scheduledFunctions();
twitchClipsCrons();
log('info', 'Server started');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: '👋🌎🚀',
  });
});

app.use('/', api);
app.use('/admin/queues', serverAdapter.getRouter());

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

app.listen(PORT, () => {
  log('info', `App listening on port ${PORT}`);
});
