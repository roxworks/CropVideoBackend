import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { path } from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';

import scheduledFunctions from './jobs/scheduleUploads';
ffmpeg.setFfmpegPath(path);
// @ts-ignore
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
ffmpeg.setFfprobePath(ffprobePath);

import crop from './routes/crop';
import schedule from './routes/schedule';

const app = express();
const PORT = process.env.PORT || 5000;

scheduledFunctions();

app.use(cors());
app.use(express.json());

app.use('/', crop);
app.use('/schedule', schedule);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
