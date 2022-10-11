import { Response, Request, NextFunction } from 'express';
import got from 'got';
import fs from 'fs';
import FormData from 'form-data';
import { performance } from 'universal-perf-hooks';
import axios from 'axios';

import { fileioUpload, makeVideoVertical } from '../crop/crop.service';
import { ClipWithId, ScheduledClipsArray } from '../crop/crop.model';
import MessageResponse from '../../interfaces/MessageResponse';
import log from '../../utils/logger';

let jobs: ClipWithId[] = [];
let currentJobId: string | undefined;

export const scheduleJobs = async (
  req: Request<{}, {}, ScheduledClipsArray>,
  res: Response<MessageResponse>,
  next: NextFunction
) => {
  if (!req.headers.authorization) return res.status(400).send();
  const { APP_KEY } = process.env;
  if (!APP_KEY) return res.status(500).json({ message: 'internal server error' });
  const ACTION_KEY = req.headers.authorization.split(' ')[1];
  if (ACTION_KEY !== APP_KEY) return res.status(400).send();

  const clips = req?.body?.scheduledClips;
  if (!clips || clips.length === 0) return res.status(200).json({ message: 'No clips scheduled' });

  let count = 0;

  // check if clip is already scheduled
  clips.forEach((clip: ClipWithId) => {
    const isFound = jobs.some((job) => job.id == clip.id);
    if (!isFound) {
      count++;
      jobs.push(clip);
    }
  });
  if (count > 0) {
    renderClips();
  }

  res.status(200).json({ message: 'jobs scheduled' });
};

export const jobsList = async (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({ count: jobs.length, currentJob: currentJobId, jobs });
};

const renderClips = async () => {
  const successfulJobs = [];
  const failedJobs = [];
  for (let job of jobs) {
    const clip = job;
    try {
      currentJobId = clip.videoId;
      const downStart = performance.now();
      const { id } = clip;
      const downloadUrl = clip.downloadUrl;
      let fileStream = got.stream(downloadUrl);
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${id}.mp4`;
      const downEnd = performance.now();
      log(
        'info',
        'render-download',
        `JOB DOWNLOAD call took ${downEnd - downStart} ms`,
        'schedule.handler'
      );

      //wait for filestream to end
      log('info', 'render-clips', 'streaming');
      const streamStart = performance.now();
      await new Promise((resolve, reject) => {
        let file = fs.createWriteStream('./' + fileName);
        fileStream.pipe(file);
        file.on('finish', () => {
          resolve('stream done -schedule');
        });
        file.on('error', (err) => {
          log('error', 'render-write-stream', 'GOOFED', 'schedule.handler');
        });
      });
      const streamEnd = performance.now();
      log('info', 'stream-timer', `JOB Stream call took ${streamEnd - streamStart} ms`);

      const verticalStart = performance.now();
      const editVideo = await makeVideoVertical(clip, clip.cropData, fileName);
      const verticalEnd = performance.now();
      log(
        'info',
        'render-make-vertical',
        `JOB makeVideoVertical call took ${verticalEnd - verticalStart} ms`,
        'schedule.handler'
      );

      //fileIo
      let form = new FormData();
      const fileStart = performance.now();
      form.append('file', fs.createReadStream(`./${editVideo}`));
      let fileIOResponse = await fileioUpload(form);

      const fileEnd = performance.now();
      log('info', 'render-fileio', `Fileio upload call took ${fileEnd - fileStart} ms`);

      job.status = 'RENDERED';
      job.renderedUrl = fileIOResponse.data.link;

      const clipbotKey = process.env.APP_KEY;

      await axios.post(
        `${process.env.CLIPBOT_URL}/api/clips/renderScheduledClips`,
        { clip: job },
        {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer: ${clipbotKey}` }
        }
      );
      successfulJobs.push(job);

      // delete local files
      fs.unlinkSync(`./${editVideo}`);
      fs.unlinkSync('./' + fileName);
      log('info', 'render-files-deleted', { editVideo, fileName }, 'schedule.handler');
    } catch (error) {
      if (error instanceof Error) {
        log('error', 'schedule-error', error.message);
      }
      failedJobs.push(job);
    }
  }
  log('info', 'schedule-jobs-finsihed');
  log('info', 'schedule-successful-jobs', successfulJobs, 'schedule.handler');
  log('error', 'schedule-failed-jobs', failedJobs, 'schedule.handler');
  jobs = [];
};
