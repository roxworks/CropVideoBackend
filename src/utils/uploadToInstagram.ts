/* eslint-disable no-await-in-loop */
import log from './logger';

const BASE_URL = 'https://graph.facebook.com/v15.0';
// const tempUserId = "17841445045171652";

const axios = require('axios');

let id: string;
let pageId: string;

// eslint-disable-next-line no-promise-executor-return
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getUserID = async (accessToken: string) => {
  // const accessToken = getCurrentSettings().accessToken;
  const response = await axios.get(
    `${BASE_URL}/me/accounts?fields=instagram_business_account{id, username}&access_token=${accessToken}`
  );
  id = response.data?.data?.[0]?.instagram_business_account?.id;
  return id;
};

const getPageNameandId = async (accessToken: string) => {
  const response = await axios.get(
    `${BASE_URL}/me/accounts?fields=name&access_token=${accessToken}`
  );
  const name = response.data?.data?.[0].name;
  const resId = response.data?.data?.[0].id;

  return { pageName: name, pageId: resId } as { pageName: string; pageId: string };
};

const createMediaContainer = async (accessToken: string, downloadURL: string, caption: string) => {
  try {
    if (!id) {
      log('info', 'instagram get id');

      const newId = await getUserID(accessToken);
      if (!newId) {
        log('error', 'instgram could not get id', { downloadURL });
        throw new Error('Could not get id');
      }
    }
    const encodedCaption: string = caption?.replace(/#/g, '%23') || 'Uploaded with ClipbotTv';
    log('warn', 'instagram encoded caption', { encodedCaption, caption });
    // try {
    //   encodedCaption = caption && caption.includes('#') ? caption.replaceAll('#', '%23') : caption;
    // } catch (error) {
    //   log('error', 'instagram cation error', error);
    // }
    const videoLocation = downloadURL;

    const mediaCreationURL = `${BASE_URL}/${id}/media?media_type=REELS&video_url=${encodeURIComponent(
      videoLocation
    )}&access_token=${accessToken}&caption=${encodedCaption}`;

    let response;

    try {
      response = await axios.post(mediaCreationURL);
    } catch (e: unknown) {
      log('error', 'instagram failed to create media container', {
        downloadURL,
        caption,
        error: e,
      });
      throw new Error(JSON.stringify(e));
    }

    return response?.data?.id;
  } catch (error) {
    log('error', 'instagram createMediaContainer', error);
    throw new Error(JSON.stringify(error));
  }
};

const waitForContainerUpload = async (accessToken: string, containerId: string) => {
  log('info', 'instagram waitForContainerUpload start');
  const checkUploadStatusURL = `${BASE_URL}/${containerId}?fields=status_code,status&access_token=${accessToken}`;
  let status = '';
  let response;

  do {
    await sleep(1000);
    try {
      response = await axios.get(checkUploadStatusURL);
    } catch (e: unknown) {
      log('error', 'instagram failed waitForContainerUpload', { error: e });
      throw new Error(JSON.stringify(e));
    }
    status = response?.data?.status_code;
    log('info', 'instagram waitForContainerUpload IN_PROGRESS', {
      response: response?.data,
      status,
    });
  } while (status === 'IN_PROGRESS');

  if (status === 'FINISHED') {
    log('info', 'instagram waitForContainerUpload FINISHED');
    return containerId;
  }
  log('error', 'Possible failed insgram upload', {
    status,
    data: response?.data,
    resStatus: response?.status,
  });
  throw new Error('Possible failed instagram upload: ', response?.data);
};

const publishMediaContainer = async (accessToken: string, containerId: string) => {
  // const containerId = '17938803718939574';
  log('info', 'instagram publishing video');
  if (!id) {
    await getUserID(accessToken);
  }
  const mediaPublishURL = `${BASE_URL}/${id}/media_publish?creation_id=${containerId}&access_token=${accessToken}`;
  let response;
  try {
    response = await axios.post(mediaPublishURL);
  } catch (e: any) {
    log('error', 'instagram failed to publish media container', { containerId, error: e });
    throw new Error(JSON.stringify(e));
  }

  log('info', 'instagram publishMediaContaier Response:', response?.data);
  return response;
};

export const doIGUpload = async (accessToken: string, downloadURL: string, caption: string) =>
  createMediaContainer(accessToken, downloadURL, caption)
    .then((container) => waitForContainerUpload(accessToken, container))
    .then((container) => publishMediaContainer(accessToken, container));

const startFbUpload = async (accessToken: string, fbId: string) => {
  pageId = fbId;
  if (!pageId) {
    pageId = (await getPageNameandId(accessToken)).pageId;
  }
  const url = `${BASE_URL}/${pageId}/video_reels?upload_phase=start&access_token=${accessToken}`;
  let response;
  try {
    response = await axios.post(url);
  } catch (e) {
    /* empty */
  }

  return response.data;
};

const uploadVideoToFb = async (
  pageAccessToken: string,
  downloadUrl: string,
  startUpload: { video_id: string; upload_url: string }
) => {
  if (!startUpload.upload_url) throw new Error('video upload Url not found');
  const baseUrl = startUpload.upload_url;
  try {
    const response = await axios.post(
      baseUrl,
      {},
      {
        headers: {
          Authorization: `OAuth ${pageAccessToken}`,
          file_url: downloadUrl,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
      }
    );

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      log('error', error.message);
    }
    throw new Error(JSON.stringify(error));
  }
};

const waitForFbUpload = async (pageAccessToken: string, videoId: string) => {
  if (!videoId) throw new Error('invalid video id');
  const url = `${BASE_URL}/${videoId}?fields=status`;
  // not_started, in_progress, complete, error

  let uploadStatus = '';
  let response;

  do {
    await sleep(1000);
    try {
      response = await axios.get(url, {
        headers: { Authorization: `OAuth ${pageAccessToken}` },
      });
    } catch (e) {
      if (e instanceof Error) {
        log('error', e.message);
      }
    }
    uploadStatus = response?.data?.status?.uploading_phase?.status;
  } while (uploadStatus === 'in_progress');

  if (uploadStatus === 'complete') {
    return videoId;
  }

  throw new Error('Possible failed facebook wait upload: ', response?.data);
};

const publishFbVideo = async (
  pageAccessToken: string,
  fbId: string,
  videoId: string,
  description: string
) => {
  pageId = fbId;

  if (!pageId) {
    pageId = (await getPageNameandId(pageAccessToken)).pageId;
  }
  const url = `${BASE_URL}/${pageId}/video_reels?upload_phase=finish&access_token=${pageAccessToken}`;
  const fields = `&video_id=${videoId}&video_state=PUBLISHED&description=${description}`;
  const fullUrl = url + fields;
  try {
    const res = await axios.post(fullUrl);
    return res.data;
  } catch (err) {
    // @ts-ignore
    if (err instanceof Error) {
      log('error', err.message);
    }
    // @ts-ignore
    throw new Error(JSON.stringify(err?.response?.data?.error));
  }
};

export const doFbUpload = async (
  pageAccessToken: string,
  fbId: string,
  downloadUrl: string,
  description: string
) => {
  try {
    const startUpload = await startFbUpload(pageAccessToken, fbId);
    await uploadVideoToFb(pageAccessToken, downloadUrl, startUpload);
    const checkStatus = await waitForFbUpload(pageAccessToken, startUpload.video_id);
    const publish = await publishFbVideo(pageAccessToken, fbId, startUpload.video_id, description);

    return { publish, checkStatus, videoId: startUpload.video_id };
  } catch (error: unknown) {
    if (error instanceof Error) {
      log('error', error.message);
    }
    throw new Error(JSON.stringify(error));
  }
};
