import got from 'got';
import fs from 'fs';
import FormData from 'form-data';
import { performance } from 'universal-perf-hooks';

import { fileioUpload, makeVideoVertical } from '../service/cropService.js';

const currentJobStatus = {};

export const createCropVideo = async (req, res) => {
  if (!req.headers.authorization) return res.status(400).send();
  const { APP_KEY } = process.env;
  if (!APP_KEY) return res.status(500).send('internal server error');
  const ACTION_KEY = req.headers.authorization.split(' ')[1];
  if (ACTION_KEY !== APP_KEY) return res.status(400).send();

  const { clip, cropData } = req.body;
  console.log('Clip Data');
  console.log(clip);
  console.log('cropData');
  console.log(cropData);

  if (!clip || !cropData) return res.status(400).send('please provide both clip and crop data');

  const downStart = performance.now();
  const { id } = clip;
  const downloadUrl = clip.download_url || clip.downloadUrl;
  let fileStream = got.stream(downloadUrl);
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${id}.mp4`;

  const downEnd = performance.now();
  console.log(`DOWNLOAD call took ${downEnd - downStart} ms`);

  currentJobStatus[fileName] = { status: 'processing' };
  res.status(200).send({ id: fileName, ...currentJobStatus[fileName] });

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
  console.log(`Stream call took ${streamEnd - streamStart} ms`);

  const verticalStart = performance.now();
  const editVideo = await makeVideoVertical(clip, cropData, fileName);
  const verticalEnd = performance.now();
  console.log(`makeVideoVertical call took ${verticalEnd - verticalStart} ms`);

  console.log('video edited');

  console.log('editedVid:', editVideo);

  //fileIo
  let form = new FormData();
  const fileStart = performance.now();
  form.append('file', fs.createReadStream(`./${editVideo}`));
  let fileIOResponse = await fileioUpload(form);

  const fileEnd = performance.now();
  console.log(`Fileio upload call took ${fileEnd - fileStart} ms`);

  console.log('fileio done');

  currentJobStatus[fileName] = {
    fileURL: fileIOResponse.data.link,
    key: fileIOResponse.data.key,
    status: 'done',
  };

  // delete local files
  fs.unlinkSync(`./${editVideo}`);
  fs.unlinkSync('./' + fileName);
  console.log('files deleted: ', editVideo, fileName);
};

export const videoStatus = async (req, res) => {
  const jobId = req.query.id;
  res.status(200).send(currentJobStatus[jobId]);
};
