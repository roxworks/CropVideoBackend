/* eslint-disable no-await-in-loop */
import { Response, Request } from 'express';
import got from 'got';
import fs from 'fs';
import FormData from 'form-data';
import { performance } from 'universal-perf-hooks';
import axios from 'axios';

import { fileioUpload, makeVideoVertical } from '../crop/crop.service';
import { ClipWithId, ScheduledClipsArray } from '../crop/crop.model';
import MessageResponse from '../../interfaces/MessageResponse';
import log from '../../utils/logger';
import { getOrCreateSrtJson, convertTranscriptToSrtFile } from '../../service/Transcription';
import { isUserSubbed } from '../../service/User';

let jobs: ClipWithId[] = [];
let currentJobId: string | undefined;

const renderClips = async () => {
  const successfulJobs = [];
  const failedJobs = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const job of jobs) {
    const clip = job;
    const randomNumber = Math.random().toString(36).substring(2, 15);
    let editVideo: string | undefined;
    let fileName: string | undefined;
    let srtFileName: string | undefined;
    try {
      currentJobId = clip.twitch_id;
      const downStart = performance.now();
      const { id, twitch_id } = clip;
      const { downloadUrl } = clip;
      const fileStream = got.stream(downloadUrl);
      fileName = `${randomNumber}_${twitch_id || id}.mp4`;
      srtFileName = clip.autoCaption ? `${randomNumber}_${twitch_id || id}.srt` : undefined;
      const downEnd = performance.now();
      log(
        'info',
        'render-download',
        `JOB DOWNLOAD call took ${downEnd - downStart} ms`,
        'schedule.handler'
      );
      const isSubbed = await isUserSubbed(clip.userId);
      if (clip.autoCaption && isSubbed) {
        const srt = await getOrCreateSrtJson(clip.downloadUrl, clip.twitch_id, clip.userId);
        if (!srt || !srtFileName) return;
        srtFileName = await convertTranscriptToSrtFile(srt, srtFileName);
      }

      // wait for filestream to end
      log('info', 'render-clips', 'streaming');
      const streamStart = performance.now();

      await new Promise((resolve) => {
        const file = fs.createWriteStream(`./${fileName}`);
        fileStream.pipe(file);
        file.on('finish', () => {
          resolve('stream done -schedule');
        });
        file.on('error', () => {
          log('error', 'render-write-stream', 'GOOFED', 'schedule.handler');
        });
      });
      const streamEnd = performance.now();
      log('info', 'stream-timer', `JOB Stream call took ${streamEnd - streamStart} ms`);

      const verticalStart = performance.now();
      editVideo = await makeVideoVertical(clip, clip.cropData, fileName, srtFileName, isSubbed);
      const verticalEnd = performance.now();
      log(
        'info',
        'render-make-vertical',
        `JOB makeVideoVertical call took ${verticalEnd - verticalStart} ms`,
        'schedule.handler'
      );

      // fileIo
      const form = new FormData();
      const fileStart = performance.now();
      form.append('file', fs.createReadStream(`./${editVideo}`));
      // eslint-disable-next-line no-await-in-loop
      const fileIOResponse = await fileioUpload(form);

      const fileEnd = performance.now();
      log('info', 'render-fileio', `Fileio upload call took ${fileEnd - fileStart} ms`);

      job.status = 'RENDERED';
      job.renderedUrl = fileIOResponse.data.link;

      const clipbotKey = process.env.APP_KEY;

      // eslint-disable-next-line no-await-in-loop
      await axios.post(
        `${process.env.CLIPBOT_URL}/api/clips/renderScheduledClips`,
        { clip: job, failed: false },
        {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer: ${clipbotKey}` },
        }
      );
      successfulJobs.push(job);

      // delete local files
      fs.unlinkSync(`./${editVideo}`);
      fs.unlinkSync(`./${fileName}`);
      if (srtFileName) {
        fs.unlinkSync(`./${srtFileName}`);
      }
      log('info', 'render-files-deleted', { editVideo, fileName }, 'schedule.handler');
    } catch (error) {
      if (error instanceof Error) {
        log('error', 'schedule-error', { clip: job, error: error.message });
      }
      failedJobs.push(job);
      //remove job from array
      jobs = jobs.filter((j) => j.twitch_id !== job.twitch_id);
      const clipbotKey = process.env.APP_KEY;
      axios.post(
        `${process.env.CLIPBOT_URL}/api/clips/renderScheduledClips`,
        { clip: job, failed: true },
        {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer: ${clipbotKey}` },
        }
      );
      if (fileName) {
        fs.unlinkSync(`./${fileName}`);
      }
      if (srtFileName) {
        fs.unlinkSync(`./${srtFileName}`);
      }
      if (fs.existsSync(`./rendered_${fileName}`)) {
        fs.unlinkSync(`./rendered_${fileName}`);
      }
      continue;
    }
  }
  log('info', 'schedule-jobs-finsihed');
  log('info', 'schedule-successful-jobs', successfulJobs, 'schedule.handler');
  log('error', 'schedule-failed-jobs', failedJobs, 'schedule.handler');
  jobs = [];
};

export const scheduleJobs = async (
  req: Request<{}, {}, ScheduledClipsArray>,
  res: Response<MessageResponse>
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
    const isFound = jobs.some((job) => job.id === clip.id);
    if (!isFound) {
      count += 1;
      jobs.push(clip);
    }
  });
  if (count > 0) {
    renderClips();
  }

  return res.status(200).json({ message: 'jobs scheduled' });
};

export const jobsList = async (_: Request, res: Response) => {
  res.status(200).json({ count: jobs.length, currentJob: currentJobId, jobs });
};
