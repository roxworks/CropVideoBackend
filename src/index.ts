import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { path } from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import * as middlewares from './middlewares';
import api from './api';

import scheduledFunctions from './jobs/scheduleUploads';
ffmpeg.setFfmpegPath(path);
// @ts-ignore
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import MessageResponse from './interfaces/MessageResponse';
ffmpeg.setFfprobePath(ffprobePath);

const app = express();
const PORT = process.env.PORT || 5000;

scheduledFunctions();

app.use(cors());
app.use(express.json());

app.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: '👋🌎🚀',
  });
});

app.use('/', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
