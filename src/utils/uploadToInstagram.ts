import { Response } from 'express';
const BASE_URL = 'https://graph.facebook.com/v15.0';
// const tempUserId = "17841445045171652";

const axios = require('axios');
let id: string;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getUserID = async (accessToken: string) => {
  // const accessToken = getCurrentSettings().accessToken;
  const response = await axios.get(
    BASE_URL +
      '/me/accounts?fields=instagram_business_account{id, username}&access_token=' +
      accessToken
  );
  console.log(JSON.stringify(response.data));
  id = response.data?.data?.[0]?.instagram_business_account?.id;
  console.log('Got id: ', id);
  return id;
};
const createMediaContainer = async (accessToken: string, downloadURL: string, caption: string) => {
  if (!id) {
    console.log('gettin id');
    let newId = await getUserID(accessToken);
    if (!newId) {
      throw new Error('Could not get id');
    }
  }

  const encodedCaption = caption?.replaceAll('#', '%23') || 'Uploaded with ClipbotTv';
  const videoLocation = downloadURL;
  console.log({ videoLocation });
  const mediaCreationURL = `${BASE_URL}/${id}/media?media_type=REELS&video_url=${encodeURIComponent(
    videoLocation
  )}&access_token=${accessToken}&caption=${encodedCaption}`;
  let response;
  try {
    response = await axios.post(mediaCreationURL);
  } catch (e: any) {
    console.log(e);
    console.log(e.response?.headers?.['www-authenticate']);
  }

  console.log('Response:', response?.data);
  return response?.data?.id;
};

const waitForContainerUpload = async (accessToken: string, containerId: string) => {
  console.log('--waitForContainerUpload start--');
  const checkUploadStatusURL = `${BASE_URL}/${containerId}?fields=status_code,status&access_token=${accessToken}`;
  let status = '';
  let response;

  do {
    await sleep(1000);
    try {
      console.log('checking upload status');
      response = await axios.get(checkUploadStatusURL);
    } catch (e: any) {
      console.log(e);
      console.log(e.response?.headers?.['www-authenticate']);
    }
    status = response?.data?.status_code;
    console.log('--waitForContainerUpload IN_PROGRESS--');
    console.log('Response: ', response?.data);
    console.log('Status: ', status);
  } while (status === 'IN_PROGRESS');

  if (status == 'FINISHED') {
    console.log('--waitForContainerUpload FINISHED--');
    return containerId;
  } else {
    console.log('Final Status: ', status);
    console.log('Possible failed instagram upload: ', response?.data, response?.status);
    throw new Error('Possible failed instagram upload: ', response?.data);
  }
};

const publishMediaContainer = async (accessToken: string, containerId: string) => {
  // const containerId = '17938803718939574';
  console.log('publishing');
  if (!id) {
    await getUserID(accessToken);
  }
  const mediaPublishURL = `${BASE_URL}/${id}/media_publish?creation_id=${containerId}&access_token=${accessToken}`;
  let response;
  try {
    response = await axios.post(mediaPublishURL);
  } catch (e: any) {
    console.log(e);
    console.log(e.response?.headers?.['www-authenticate']);
  }

  console.log('Response:', response?.data);
  return response;
};

export const doIGUpload = async (accessToken: string, downloadURL: string, caption: string) => {
  return createMediaContainer(accessToken, downloadURL, caption)
    .then((container) => waitForContainerUpload(accessToken, container))
    .then((container) => publishMediaContainer(accessToken, container));
};
