import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import { Clip, CropData} from './crop.model';
import log from '../../utils/logger';

export const fileioUpload = (formData: any) => {
  const tempFormData = formData;
  // @ts-ignore
  tempFormData.append('maxDownloads', '10');
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  tempFormData.append('expires', tomorrow.toISOString());
  tempFormData.append('autoDelete', 'true');
  return axios.post('https://file.io', tempFormData, {
    headers: {
      Authorization: `Bearer ${  process.env.FILE_IO_KEY}`
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
};

export const getVideoDetails = (fileName: string) => new Promise((resolve, reject) => {
    ffmpeg.ffprobe(fileName, (err, metadata) => {
      if (err) {
        log('error', 'ffmpeg-ffprobe', err, 'crop.service');
        reject(err);
      } else {
        log('info', 'ffmpeg-ffprobe video details', { metadata, fileName }, 'crop.service');
        const {size} = metadata.format;
        resolve(size);
      }
    });
  });

// return a number rounded to the nearest multiple of 4
const roundTo4 = (number: number, dontConvert?: boolean) => dontConvert ? number : Math.ceil(number / 4) * 4;

export const makeVideoVertical = async (clip: Clip, clipSettings: CropData, fileName: string) => {
  log('info', 'make-video-vertical clip', { clip, clipSettings }, 'crop.service');

  const {cropType} = clipSettings;

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

  const {camCrop} = clipSettings;
  const {screenCrop} = clipSettings;
  const isNormalized = camCrop?.isNormalized || screenCrop?.isNormalized || false;

  // top (cam)
  const CWA = camCrop?.width !== undefined ? roundTo4(camCrop.width, isNormalized) : 350;
  const CHA = camCrop?.height !== undefined ? roundTo4(camCrop.height, isNormalized) : 263;
  const CXA = camCrop?.x !== undefined ? roundTo4(camCrop.x, isNormalized) : 1600;
  const CYA = camCrop?.y !== undefined ? roundTo4(camCrop.y, isNormalized) : 50;
  const SWA = OUTPUT_WIDTH; // SHA * CWA / CHA;
  const multiplier = isNormalized ? 9 / 16 : 1;
  const SHA = roundTo4(Math.ceil(((SWA * CHA) / CWA) * multiplier));
  // const HA = SHA;

  // bottom
  // const OW = OUTPUT_WIDTH;
  const CWB =
    screenCrop.width !== undefined
      ? roundTo4(Number(screenCrop.width), isNormalized)
      : OUTPUT_WIDTH;
  const CHB =
    screenCrop.height !== undefined
      ? roundTo4(Number(screenCrop.height), isNormalized)
      : OUTPUT_WIDTH;
  const CXB = screenCrop.x !== undefined ? roundTo4(screenCrop.x, isNormalized) : 420;
  const CYB = screenCrop.y !== undefined ? roundTo4(screenCrop.y, isNormalized) : 0;
  let SHB = Math.floor(OUTPUT_HEIGHT - SHA);
  let SWB = OUTPUT_WIDTH;
  // const HB = SHB;

  if (cropType === 'freeform') {
    if (CHB / CWB > 16 / 9) {
      log('info', 'crop-freeform', `Crop is too tall, forcing to ${OUTPUT_HEIGHT} height`);
      SHB = OUTPUT_HEIGHT;
      SWB = roundTo4(Math.ceil((SHB * CWB) / CHB));
    } else {
      log('info', 'crop-freeform', `Crop is too wide, forcing to ${OUTPUT_WIDTH} width`);
      SWB = OUTPUT_WIDTH;
      SHB = roundTo4(Math.ceil(((SWB * CHB) / CWB) * multiplier));
    }
  }
  if (cropType === 'cam-freeform') {
    if (CHB / CWB > 16 / 9) {
      log('info', 'crop-cam-freeform', `Crop is too tall, forcing to ${OUTPUT_HEIGHT} height`);
      // SHB = 1920 - SHA;
      SWB = Math.ceil((SHB * CWB) / (CHB * multiplier));
    } else {
      log('info', 'crop-freeform', `Crop is too wide, forcing to ${OUTPUT_WIDTH} width`);
      // SWB = 1080;
      SHB = roundTo4(Math.ceil(((SWB * CHB) / CWB) * multiplier));
    }
  }

  // console.log(`CWA: ${CWA}`);
  // console.log(`CHA: ${CHA}`);
  // console.log(`CXA: ${CXA}`);
  // console.log(`CYA: ${CYA}`);
  // console.log(`CWB: ${CWB}`);
  // console.log(`CHB: ${CHB}`);
  // console.log(`CXB: ${CXB}`);
  // console.log(`CYB: ${CYB}`);

  // log all heights and widths
  // console.log(`SHA: ${  SHA}`);
  // console.log(`SWA: ${  SWA}`);
  // console.log(`SHB: ${  SHB}`);
  // console.log(`SWB: ${  SWB}`);
  // console.log(`HA: ${  HA}`);
  // console.log(`HB: ${  HB}`);

  let filter = '';
  if (isNormalized) {
    switch (cropType) {
      // Math.ceil(number / 4) * 4
      case 'cam-top':
        filter = `[0:v]split=2[a][b];
        [a]crop=w=min(ceil(${CWA}*iw/4)*4\\, iw):h=min(ceil(${CHA}*ih/4)*4\\, ih):x=min(ceil(${CXA}*iw/4)*4\\, iw):y=min(ceil(${CYA}*ih/4)*4\\, ih),scale=w=min(${OUTPUT_WIDTH}\\, ceil(${SWA}/4)*4):h=min(${OUTPUT_HEIGHT}\\, ceil(${SHA}/4)*4)[a];
        [b]crop=w=min(ceil(${CWB}*iw/4)*4\\, iw):h=min(ceil(${CHB}*ih/4)*4\\, ih):x=min(ceil(${CXB}*iw/4)*4\\, iw):y=min(ceil(${CYB}*ih/4)*4\\, ih),scale=w=min(${OUTPUT_WIDTH}\\, ceil(${SWB}/4)*4):h=min(${OUTPUT_HEIGHT}\\, ceil(${SHB}/4)*4),pad=w=${OUTPUT_WIDTH}:h=${
          OUTPUT_HEIGHT - SHA
        }:x=(ow-iw)/2:y=0:color=black[b];
        [a][b]vstack`;
        break;
      case 'cam-freeform':
        filter = `[0:v]split=2[a][b];
        [a]crop=w=min(ceil(${CWA}*iw/4)*4\\, iw):h=min(ceil(${CHA}*ih/4)*4\\, ih):x=min(ceil(${CXA}*iw/4)*4\\, iw):y=min(ceil(${CYA}*ih/4)*4\\, ih),scale=w=min(${OUTPUT_WIDTH}\\, ceil(${SWA}/4)*4):h=min(${OUTPUT_HEIGHT}\\, ceil(${SHA}/4)*4)[a];
        [b]crop=w=min(ceil(${CWB}*iw)\\, iw):h=min(ceil(${CHB}*ih)\\, ih):x=min(ceil(${CXB}*iw)\\, iw):y=min(ceil(${CYB}*ih)\\, ih),scale=w=min(${OUTPUT_WIDTH}\\, ${SWB}):h=min(${OUTPUT_HEIGHT}\\, ${SHB}),pad=w=${OUTPUT_WIDTH}:h=${
          OUTPUT_HEIGHT - SHA
        }:x=(ow-iw)/2:y=0:color=black[b];
        [a][b]vstack`;
        break;
      case 'no-cam':
        filter = `crop=w=min(ceil(${CWB}*iw/4)*4\\, iw):h=min(ceil(${CHB}*ih/4)*4\\, ih):x=min(ceil(${CXB}*iw/4)*4\\, iw):y=min(ceil(${CYB}*ih/4)*4\\, ih),scale=w=${OUTPUT_WIDTH}:h=${OUTPUT_HEIGHT}`;
        break;
      case 'freeform':
        filter = `crop=w=min(ceil(${CWB}*iw/4)*4\\, iw):h=min(ceil(${CHB}*ih/4)*4\\, ih):x=min(ceil(${CXB}*iw/4)*4\\, iw):y=min(ceil(${CYB}*ih/4)*4\\, ih),scale=w=${SWB}:h=${SHB},pad=w=${OUTPUT_WIDTH}:h=${OUTPUT_HEIGHT}:x=(ow-iw)/2:y=(oh-ih)/2`;
        break;
      default:
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
      default:
        break;
    }
  }

  log('info', 'running command', filter);
  const maxEndTime = 59;
  const command = new Promise((resolve, reject) => {
    let commandToRunInternal = ffmpeg(inputFilePath)
      .videoCodec('libx265')
      .on('error', (err ) => {
        log('error', 'command error', err);
        reject(err);
      })
      .on('end', () => {
        resolve(outputFilePath);
      })
      .autopad(true, 'pink')
      .outputOptions(['-loglevel debug'])
      .videoFilter(`${filter  },fps=30`) // omega filter extra
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

  const outputFile = await command;

  return outputFile;
};
