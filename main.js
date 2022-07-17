import express from 'express';
import cors from 'cors';
import { path } from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';

import scheduledFunctions from './jobs/scheduleUploads.js';

ffmpeg.setFfmpegPath(path);
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
ffmpeg.setFfprobePath(ffprobePath);

import crop from './routes/crop.js';
import schedule from './routes/schedule.js';

import 'dotenv/config';

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
