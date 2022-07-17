import got from 'got';
import fs from 'fs';
import FormData from 'form-data';
import { performance } from 'universal-perf-hooks';
import axios from 'axios';

import { fileioUpload, makeVideoVertical } from '../service/cropService.js';

let jobs = [];
let currentJobId;

export const scheduleJobs = async (req, res) => {
  if (!req.headers.authorization) return res.status(400).send();
  const { APP_KEY } = process.env;
  if (!APP_KEY) return res.status(500).send('internal server error');
  const ACTION_KEY = req.headers.authorization.split(' ')[1];
  if (ACTION_KEY !== APP_KEY) return res.status(400).send();

  const clips = req?.body?.scheduledClips;
  if (!clips || clips.length === 0) return res.status(200).send('No clips scheduled');

  // check if clip is already scheduled
  clips.forEach((clip) => {
    const isFound = jobs.some((job) => job.id == clip.id);
    if (!isFound) jobs.push(clip);
  });
  renderClips();

  res.status(200).send('jobs scheduled');
};

export const jobsList = async (req, res) => {
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
      const downloadUrl = clip.download_url || clip.downloadUrl;
      let fileStream = got.stream(downloadUrl);
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${id}.mp4`;
      const downEnd = performance.now();
      console.log(`JOB DOWNLOAD call took ${downEnd - downStart} ms`);

      //wait for filestream to end
      console.log('streaming');
      const streamStart = performance.now();
      await new Promise((resolve, reject) => {
        let file = fs.createWriteStream('./' + fileName);
        fileStream.pipe(file);
        file.on('finish', () => {
          resolve();
        });
        file.on('error', (err) => {
          console.log('GOOFED');
        });
      });
      const streamEnd = performance.now();
      console.log(`JOB Stream call took ${streamEnd - streamStart} ms`);

      const verticalStart = performance.now();
      const editVideo = await makeVideoVertical(clip, clip.cropData, fileName);
      const verticalEnd = performance.now();
      console.log(`JOB makeVideoVertical call took ${verticalEnd - verticalStart} ms`);

      console.log('video edited');

      //fileIo
      let form = new FormData();
      const fileStart = performance.now();
      form.append('file', fs.createReadStream(`./${editVideo}`));
      let fileIOResponse = await fileioUpload(form);

      const fileEnd = performance.now();
      console.log(`Fileio upload call took ${fileEnd - fileStart} ms`);

      console.log('fileio done');

      job.status = 'RENDERED';
      job.renderedUrl = fileIOResponse.data.link;

      const clipbotKey = process.env.APP_KEY;

      await axios.post(
        `${process.env.CLIPBOT_URL}/api/clips/renderScheduledClips`,
        { clip: job },
        {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer: ${clipbotKey}` },
        }
      );

      successfulJobs.push(job);

      // delete local files
      fs.unlinkSync(`./${editVideo}`);
      fs.unlinkSync('./' + fileName);
      console.log('files deleted: ', editVideo, fileName);
    } catch (error) {
      console.log(error.message);
      failedJobs.push(job);
    }
  }
  console.log(new Date());
  console.log('Successful jobs: ', successfulJobs);
  console.log('Failed jobs: ', failedJobs);
  jobs = [];
};
