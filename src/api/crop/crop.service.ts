import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import { Clip, CropData } from './crop.model';
import log from '../../utils/logger';

export const fileioUpload = (formData: any) => {
  let tempFormData = formData;
  //@ts-ignore
  tempFormData.append('maxDownloads', '10');
  let today = new Date();
  let tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  tempFormData.append('expires', tomorrow.toISOString());
  tempFormData.append('autoDelete', 'true');
  return axios.post('https://file.io', tempFormData, {
    headers: {
      Authorization: 'Bearer ' + process.env.FILE_IO_KEY
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
};

export const getVideoDetails = (fileName: string) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(fileName, (err, metadata) => {
      if (err) {
        log('error', 'ffmpeg-ffprobe', err, 'crop.service');
        reject(err);
      } else {
        log('info', 'ffmpeg-ffprobe video details', { metadata, fileName }, 'crop.service');
        const size = metadata.format.size;
        resolve(size);
      }
    });
  });
};

// return a number rounded to the nearest multiple of 4
let roundTo4 = (number: number, dontConvert?: boolean) => {
  return dontConvert ? number : Math.ceil(number / 4) * 4;
};

export const makeVideoVertical = async (clip: Clip, clipSettings: CropData, fileName: string) => {
  log('info', 'make-video-vertical clip', { clip, clipSettings }, 'crop.service');

  const currentClip = clip;
  const cropType = clipSettings.cropType;

  const inputFilePath = `./${fileName}`;
  const outputFilePath = `./rendered_${fileName}`;

  const MAX_SIZE = 50000000;
  const size = (await getVideoDetails(inputFilePath)) as number;
  let OUTPUT_HEIGHT = 1920;
  let OUTPUT_WIDTH = 1080;
  if (size > 0.6 * MAX_SIZE) {
    log('warn', 'make-video-vertical', 'MAX_SIZE limit hit', 'crop.service');
    OUTPUT_HEIGHT = 1280;
    OUTPUT_WIDTH = 720;
  }

  const camCrop = clipSettings.camCrop;
  const screenCrop = clipSettings.screenCrop;
  const isNormalized = camCrop?.isNormalized || screenCrop?.isNormalized || false;

  //top (cam)
  let CWA = camCrop?.width !== undefined ? roundTo4(camCrop.width, isNormalized) : 350;
  let CHA = camCrop?.height !== undefined ? roundTo4(camCrop.height, isNormalized) : 263;
  let CXA = camCrop?.x !== undefined ? roundTo4(camCrop.x, isNormalized) : 1600;
  let CYA = camCrop?.y !== undefined ? roundTo4(camCrop.y, isNormalized) : 50;
  let SWA = OUTPUT_WIDTH; //SHA * CWA / CHA;
  let multiplier = isNormalized ? 9 / 16 : 1;
  let SHA = roundTo4(Math.ceil(((SWA * CHA) / CWA) * multiplier));
  let HA = SHA;
  if (cropType === 'freeform') {
    if (CHA / CWA > 16 / 9) {
      log('info', 'crop-freeform', `Crop is too tall, forcing to ${OUTPUT_HEIGHT} height`);
      SHA = OUTPUT_HEIGHT;
      SWA = roundTo4(Math.ceil((SHA * CWA) / CHA));
    } else {
      log('info', 'crop-freeform', `Crop is too wide, forcing to ${OUTPUT_WIDTH} width`);
      SWA = OUTPUT_WIDTH;
      SHA = roundTo4(Math.ceil(((SWA * CHA) / CWA) * multiplier));
    }
  }

  // bottom
  let OW = OUTPUT_WIDTH;
  let CWB =
    screenCrop.width !== undefined ? roundTo4(screenCrop.width, isNormalized) : OUTPUT_WIDTH;
  let CHB =
    screenCrop.height !== undefined ? roundTo4(screenCrop.height, isNormalized) : OUTPUT_WIDTH;
  let CXB = screenCrop.x !== undefined ? roundTo4(screenCrop.x, isNormalized) : 420;
  let CYB = screenCrop.y !== undefined ? roundTo4(screenCrop.y, isNormalized) : 0;
  let SHB = Math.floor(OUTPUT_HEIGHT - SHA);
  let SWB = OUTPUT_WIDTH;
  let HB = SHB;

  if (cropType === 'cam-freeform') {
    if (CHB / CWB > 16 / 9) {
      log('info', 'crop-cam-freeform', `Crop is too tall, forcing to ${OUTPUT_HEIGHT} height`);
      // SHB = 1920 - SHA;
      SWB = roundTo4(Math.ceil((SHB * CWB) / CHB));
    } else {
      log('info', 'crop-freeform', `Crop is too wide, forcing to ${OUTPUT_WIDTH} width`);
      // SWB = 1080;
      SHB = roundTo4(Math.ceil(((SWB * CHB) / CWB) * multiplier));
    }
  }

  let filter = '';
  if (isNormalized) {
    switch (cropType) {
      //Math.ceil(number / 4) * 4
      case 'cam-top':
      case 'cam-freeform':
        filter = `[0:v]split=2[a][b];
        [a]crop=w=min(ceil(${CWA}*iw/4)*4\\, iw):h=min(ceil(${CHA}*ih/4)*4\\, ih):x=min(ceil(${CXA}*iw/4)*4\\, iw):y=min(ceil(${CYA}*ih/4)*4\\, ih),scale=w=min(${OUTPUT_WIDTH}\\, ceil(${SWA}/4)*4):h=min(${OUTPUT_HEIGHT}\\, ceil(${SHA}/4)*4)[a];
        [b]crop=w=min(ceil(${CWB}*iw/4)*4\\, iw):h=min(ceil(${CHB}*ih/4)*4\\, ih):x=min(ceil(${CXB}*iw/4)*4\\, iw):y=min(ceil(${CYB}*ih/4)*4\\, ih),scale=w=min(${OUTPUT_WIDTH}\\, ceil(${SWB}/4)*4):h=min(${OUTPUT_HEIGHT}\\, ceil(${SHB}/4)*4),pad=w=${OUTPUT_WIDTH}:h=${
          OUTPUT_HEIGHT - SHA
        }:x=(ow-iw)/2:y=0:color=black[b];
        [a][b]vstack`;
        break;
      case 'no-cam':
        filter = `crop=w=min(ceil(${CWB}*iw/4)*4\\, iw):h=min(ceil(${CHB}*ih/4)*4\\, ih):x=min(ceil(${CXB}*iw/4)*4\\, iw):y=min(ceil(${CYB}*ih/4)*4\\, ih),scale=w=${OUTPUT_WIDTH}:h=${OUTPUT_HEIGHT}`;
        break;
      case 'freeform':
        filter = `crop=w=min(ceil(${CWA}*iw/4)*4\\, iw):h=min(ceil(${CHA}*ih/4)*4\\, ih):x=min(ceil(${CXA}*iw/4)*4\\, iw):y=min(ceil(${CYA}*ih/4)*4\\, ih),scale=w=${SWA}:h=${SHA},pad=w=${OUTPUT_WIDTH}:h=${OUTPUT_HEIGHT}:x=(ow-iw)/2:y=(oh-ih)/2`;
        break;
    }
  } else {
    switch (cropType) {
      case 'cam-top':
        filter = `[0:v]split=2[a][b];
        [a]crop=w=${CWB}:h=${CHB}:x=${CXB}:y=${CYB},scale=w=${SWB}:h=${SHB}[d];
        [b]crop=w=${CWA}:h=${CHA}:x=${CXA}:y=${CYA},scale=w=${SWA}:h=${SHA}[c];
        [c][d]vstack`;
        break;
      case 'no-cam':
        filter = `crop=${CWB}:${CHB}:${CXB}:${CYB},scale=w=${OUTPUT_WIDTH}:h=${OUTPUT_HEIGHT}`;
        break;
    }
  }

  log('info', 'running command', filter);
  const maxEndTime = 59;
  var command = new Promise((resolve, reject) => {
    let commandToRunInternal = ffmpeg(inputFilePath)
      .videoCodec('libx265')
      .on('error', function (err, stdout, stderr) {
        log('error', 'command error', err);
        reject(err);
      })
      .on('end', function (err, stdout, stderr) {
        resolve(outputFilePath);
      })
      .autopad(true, 'pink')
      .outputOptions(['-loglevel debug'])
      .videoFilter(filter + ',fps=30') //omega filter extra
      .toFormat('mp4');

    if (clipSettings.startTime) {
      commandToRunInternal = commandToRunInternal.setStartTime(
        parseInt(String(clipSettings.startTime))
      );
    }
    if (clipSettings.endTime) {
      commandToRunInternal = commandToRunInternal.setDuration(
        Math.min(parseInt(String(clipSettings.endTime) || '1000'), maxEndTime) -
          parseInt(String(clipSettings.startTime) || '0')
      );
    }

    commandToRunInternal.save(outputFilePath);
  });

  let outputFile = await command;

  return outputFile;
};
