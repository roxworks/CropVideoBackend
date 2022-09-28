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
ffmpeg.setFfmpegPath(path);
// @ts-ignore
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import MessageResponse from './interfaces/MessageResponse';
import { clipQueue } from './queues/clip.queue';
ffmpeg.setFfprobePath(ffprobePath);

const app = express();
const PORT = process.env.PORT || 5000;

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullMQAdapter(clipQueue, { readOnlyMode: true })],
  serverAdapter: serverAdapter,
});

// cron jobs
scheduledFunctions();

app.use(cors());
app.use(express.json());

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
  console.log(`App listening on port ${PORT}`);
});
