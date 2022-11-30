import FormData from 'form-data';
import axios from 'axios';
import got from 'got';
import util from 'util';
import { bufferToStream, stream2buffer } from './streamUtils';
import log from './logger';

const IsJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

export const uploadVideoToTiktok = async (tiktokAuth: string, fileURL: string) => {
  log('info', 'upload-video-to-tiktok start');
  const tiktokSessionId = tiktokAuth;

  if (!tiktokSessionId) {
    log('error', 'Tiktok sessionId not found');
    throw new Error('No sessionId found');
  } else if (!IsJsonString(tiktokSessionId)) {
    // clear setting sessionId and throw error
    log('error', 'Invalid sessionId found');
    throw new Error('Invalid sessionId found');
  } else {
    log('info', 'sessionId found', tiktokSessionId);
  }

  const tiktokAccessObject = JSON.parse(tiktokSessionId);

  // upload video file through form data using tiktok video api
  const formData = new FormData();
  let customTestURL = `https://open-api.tiktok.com/share/video/upload/?open_id=${tiktokAccessObject?.open_id}&access_token=${tiktokAccessObject?.access_token}`;
  // encode #
  customTestURL = customTestURL.replace(/#/g, '%23');

  log('info', 'trying to upload file to url', { customTestURL, fileURL });

  const fileStream = got.stream(fileURL);
  log('info', 'first stream done', fileURL);
  const fileBuffer = await stream2buffer(fileStream);
  log('info', 'second stream done', fileURL);
  const fileStream2 = bufferToStream(fileBuffer);
  log('info', 'third stream done', fileURL);
  // create file object from stream
  formData.append('video', fileStream2, { filename: 'video.mp4' });

  // formData.append('video', videoData, { filename : 'video.mp4' });
  log('info', 'ready to upload file to url', { customTestURL, fileURL });
  // do upload
  const response = await axios({
    method: 'post',
    url: customTestURL,
    data: formData,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: formData.getHeaders(),
  }).catch((error) => {
    if (error.response) {
      // Request made and server responded
      log('error', 'axios-tiktok-upload response', {
        data: util.inspect(error.response.data),
        status: util.inspect(error.response.status),
        headers: util.inspect(error.response.headers),
        error: util.inspect(error),
      });
    } else if (error.request) {
      // The request was made but no response was received
      log('error', 'axios-tiktok-upload request', util.inspect(error.request));
    } else {
      // Something happened in setting up the request that triggered an Error
      log('error', 'axios-tiktok-upload error', error.message);
    }
    throw new Error(`Error uploading file: ${JSON.stringify(error)}`);
  });

  const responseJson = response.data;
  log('info', 'tiktok upload response: ', responseJson);
  return responseJson;
};
