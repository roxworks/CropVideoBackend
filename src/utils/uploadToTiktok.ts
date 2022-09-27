import FormData from 'form-data';
import axios from 'axios';
import { bufferToStream, stream2buffer } from './streamUtils';
import got from 'got';
import util from 'util';

const IsJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

export const uploadVideoToTiktok = async (tiktokAuth: string, fileURL: string) => {
  console.log('start upload');
  let tiktokSessionId = tiktokAuth;

  if (!tiktokSessionId) {
    console.log('No sessionId found');
    throw new Error('No sessionId found');
  } else if (!IsJsonString(tiktokSessionId)) {
    //clear setting sessionId and throw error
    console.log('Invalid sessionId found');
    throw new Error('Invalid sessionId found');
  } else {
    console.log('sessionId found', tiktokSessionId);
  }

  let tiktokAccessObject = JSON.parse(tiktokSessionId);
  console.log('Got data from sessionId');

  // upload video file through form data using tiktok video api
  const formData = new FormData();
  let customTestURL =
    'https://open-api.tiktok.com/share/video/upload/?open_id=' +
    tiktokAccessObject?.open_id +
    '&access_token=' +
    tiktokAccessObject?.access_token;
  // encode #
  customTestURL = customTestURL.replace(/#/g, '%23');

  console.log('Ready to upload file to ', customTestURL);
  console.log('File URL: ', fileURL);

  let fileStream = got.stream(fileURL);
  console.log('first stream done');
  const fileBuffer = await stream2buffer(fileStream);
  console.log('second stream done');
  const fileStream2 = bufferToStream(fileBuffer);
  console.log('third stream done');
  //create file object from stream
  formData.append('video', fileStream2, { filename: 'video.mp4' });

  // formData.append('video', videoData, { filename : 'video.mp4' });
  console.log('Ready to upload file to ', customTestURL);

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
      console.log(util.inspect(error.response.data));
      console.log(util.inspect(error.response.status));
      console.log(util.inspect(error.response.headers));

      console.log(util.inspect(error.response));
    } else if (error.request) {
      // The request was made but no response was received
      console.log(util.inspect(error.request));
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', error.message);
    }
    throw new Error('Error uploading file: ' + JSON.stringify(error));
  });

  const responseJson = response.data;
  console.log('tiktok upload response: ', responseJson);
  return responseJson;
};
