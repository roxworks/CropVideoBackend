import { Response, Request } from 'express';
import got from 'got';
import fs from 'fs';
import FormData from 'form-data';
import { performance } from 'universal-perf-hooks';

import { fileioUpload, makeVideoVertical } from './crop.service';
import { JobId } from './crop.model';
import log from '../../utils/logger';

type JobStatus = {
  fileURL?: string;
  key?: string;
  status?: string;
};
const currentJobStatus: { [key: string]: JobStatus } = {};

export const createCropVideo = async (req: Request, res: Response) => {
  if (!req.headers.authorization) return res.status(400).send();
  const { APP_KEY } = process.env;
  if (!APP_KEY) return res.status(500).send('internal server error');
  const ACTION_KEY = req.headers.authorization.split(' ')[1];
  if (ACTION_KEY !== APP_KEY) return res.status(400).send();

  const { clip, cropData } = req.body;

  if (!clip || !cropData) return res.status(400).send('please provide both clip and crop data');

  const downStart = performance.now();

  const { id, twitch_id } = clip;
  const downloadUrl = clip.download_url || clip.downloadUrl;
  const fileStream = got.stream(downloadUrl);
  const fileName: string = `${Math.random().toString(36).substring(2, 15)}_${twitch_id || id}.mp4`;

  const downEnd = performance.now();
  log('info', 'download-clip', `DOWNLOAD call took ${downEnd - downStart} ms`, 'crop.handler');

  currentJobStatus[fileName] = { status: 'processing' };
  res.status(200).send({ id: fileName, ...currentJobStatus[fileName] });

  // wait for filestream to end
  log('info', 'streaming');
  await new Promise((resolve) => {
    const file = fs.createWriteStream(`./${fileName}`);
    fileStream.pipe(file);
    file.on('finish', () => {
      resolve('stream done');
    });
    file.on('error', (err) => {
      log('error', 'create-write-stream', err, 'crop.handler');
    });
  });

  const verticalStart = performance.now();
  const editVideo = await makeVideoVertical(clip, cropData, fileName);
  const verticalEnd = performance.now();
  log(
    'info',
    'make-vertical-video',
    `makeVideoVertical call took ${verticalEnd - verticalStart} ms`,
    'crop.handler'
  );

  log('info', 'video-edited', editVideo);

  // fileIo
  const form = new FormData();
  const fileStart = performance.now();
  form.append('file', fs.createReadStream(`./${editVideo}`));
  const fileIOResponse = await fileioUpload(form);

  const fileEnd = performance.now();
  log('info', 'fileio-upload', `Fileio upload call took ${fileEnd - fileStart} ms`, 'crop.handler');

  currentJobStatus[fileName] = {
    fileURL: fileIOResponse.data.link,
    key: fileIOResponse.data.key,
    status: 'done',
  };

  // delete local files
  try {
    fs.unlinkSync(`./${editVideo}`);
    fs.unlinkSync(`./${fileName}`);
    log('warn', 'files-deleted: ', { editVideo, fileName }, 'crop.handler');
  } catch (error) {
    log('error', 'delete-local-files', error, 'crop.handler');
  }

  return { message: 'done' };
};

export const videoStatus = async (req: Request<{}, {}, JobId>, res: Response<JobStatus>) => {
  const jobId = req.query.id;
  if (typeof jobId !== 'string') return res.status(400);

  return res.status(200).send(currentJobStatus[jobId]);
};
