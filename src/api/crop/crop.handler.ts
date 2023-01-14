import { Response, Request } from 'express';
import got from 'got';
import fs from 'fs';
import FormData from 'form-data';
import { performance } from 'universal-perf-hooks';

import { fileioUpload, makeVideoVertical } from './crop.service';
import { JobId, RenderClipReq } from './crop.model';
import log from '../../utils/logger';
import { getOrCreateSrtJson, convertTranscriptToSrtFile } from '../../service/Transcription';
import { isUserSubbed } from '../../service/User';

type JobStatus = {
  fileURL?: string;
  key?: string;
  status?: string;
};
const currentJobStatus: { [key: string]: JobStatus } = {};

export const createCropVideo = async (req: Request<{}, {}, RenderClipReq>, res: Response) => {
  if (!req.headers.authorization) return res.status(400).send();
  const { APP_KEY } = process.env;
  if (!APP_KEY) return res.status(500).send('internal server error');
  const ACTION_KEY = req.headers.authorization.split(' ')[1];
  if (ACTION_KEY !== APP_KEY) return res.status(400).send();

  const { clip, cropData } = req.body;

  const randomNumber = Math.random().toString(36).substring(2, 15);

  if (!clip || !cropData) return res.status(400).send('please provide both clip and crop data');

  const downStart = performance.now();

  const { id, twitch_id } = clip;
  const downloadUrl = clip.download_url || clip.downloadUrl;
  const fileStream = got.stream(downloadUrl!);
  const fileName: string = `${randomNumber}_${twitch_id || id}.mp4`;
  const srtFileName = clip.autoCaption ? `${randomNumber}_${twitch_id || id}.srt` : undefined;
  const isSubbed = await isUserSubbed(clip.userId);

  const downEnd = performance.now();
  log('info', 'download-clip', `DOWNLOAD call took ${downEnd - downStart} ms`, 'crop.handler');

  currentJobStatus[fileName] = { status: 'processing' };
  res.status(200).send({ id: fileName, ...currentJobStatus[fileName] });

  // check if autoCaption is enabled and fetch the srtJson or create if does not exist

  if (clip.autoCaption && isSubbed) {
    const srt = await getOrCreateSrtJson(clip.download_url, clip.twitch_id, clip.userId);
    if (!srt || !srtFileName) return;
    await convertTranscriptToSrtFile(srt, srtFileName);
  }

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
  const editVideo = await makeVideoVertical(clip, cropData, fileName, srtFileName, isSubbed);
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
    fs.unlinkSync(`./${srtFileName}`);
    log('warn', 'files-deleted: ', { editVideo, fileName, srtFileName }, 'crop.handler');
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
