import { google } from 'googleapis';
import axios from 'axios';

import { uploadVideoToYoutube } from '../utils/uploadToYoutube';
import { refreshYoutubeToken } from '../utils/youtubeRefresh';
import { updateAccount } from './Account';
import { getClipsReadyToUploaded, updateClip } from './Clip';
import { getUserByIdWithAccounts } from './User';
import { uploadVideoToTiktok } from '../utils/uploadToTiktok';
import { Clip, ClipWithId, ClipWithIdMongo } from '../api/crop/crop.model';
import { TAccount } from '../interfaces/Accounts';
import { exclude } from '../utils/excludeClipId';

var OAuth2 = google.auth.OAuth2;
const YOUTUBE_SECRETS = JSON.parse(process.env.YOUTUBE_SECRETS || '{}');

let jobs = [];
let currentJobId;

export const uploadClip = async () => {
  try {
    //Get clips ready to upload
    const data = await getClipsReadyToUploaded();
    if (!data || data.count === 0) return console.log('No clips to upload');
    // add clips to upload queue
    await uploadClipsQueue(data.clips);
  } catch (error) {
    console.log('Error scheduling uploads');
    if (error instanceof Error) {
      console.log(error.message);
    }
  }
};

const uploadClipsQueue = async (clips: ClipWithIdMongo[]) => {
  console.log('upload queue');
  console.log(clips.length);

  const successfulJobs = [];
  const failedJobs = [];
  for (let job of clips) {
    console.log(job.videoId);

    try {
      // check for renderURL and useriD - if fail update db status
      if (!job.renderedUrl || !job.userId) {
        console.error('Clip missing data');
        //update status in db
        const updateData = {
          ...job,
          uploaded: false,
          status: 'FAILED_SCHEDULED_UPLOAD_INVALID_DATA',
        };
        const updatedClip = await updateClip(job._id.toString(), exclude(updateData, '_id'));
        failedJobs.push(job);
        continue;
      }
      // get user with accounts
      const user = await getUserByIdWithAccounts(job.userId);
      const accounts = user?.accounts;
      if (!accounts) {
        console.error('users accounts not found');
        //update status in db
        const updateData = {
          ...job,
          uploaded: false,
          status: 'FAILED_SCHEDULED_UPLOAD_ACCOUNT_NOT_FOUND',
        };

        const updatedClip = await updateClip(job._id.toString(), exclude(updateData, '_id'));
        failedJobs.push(job);
        continue;
      }

      // upload to each platform
      const uploaded = await uploadToPlatforms(job, accounts);
      job = uploaded ?? job;

      successfulJobs.push(job);
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      }
      failedJobs.push(job);
    }
  }
  console.log('Successful jobs: ', successfulJobs);
  console.log('Failed jobs: ', failedJobs);
  jobs = [];
};

const uploadToPlatforms = async (clip: ClipWithIdMongo, accounts: TAccount[]) => {
  let uploadError = false;
  // upload to youtube
  if (clip.uploadPlatforms.includes('YouTube') && !clip.youtubeUploaded) {
    const ytUpload = await uploadToYoutube(clip, accounts);
    if (ytUpload.error) uploadError = true;
  }

  //  upload to tiktok
  if (clip.uploadPlatforms.includes('TikTok') && !clip.tiktokUploaded) {
    const tiktokUpload = await uploadToTiktok(clip, accounts);
    if (tiktokUpload.error) uploadError = true;
  }

  // update db
  console.log('Updating clip in db...');
  try {
    const updateData = {
      ...clip,
      uploaded: true,
      uploadTime: new Date(new Date().toUTCString()),
      status: uploadError ? 'FAILED_SCHEDULED_UPLOAD' : 'SUCCESS_SCHEDULED_UPLOAD',
    };

    console.log('clipdata: ', clip);

    const updatedClip = await updateClip(clip._id.toString(), exclude(updateData, '_id'));

    return updatedClip?.value;
  } catch (error) {
    console.log(error);
  }
};

const uploadToYoutube = async (clip: ClipWithIdMongo, accounts: TAccount[]) => {
  console.log('Youtube upload');
  const youtubeToken = accounts?.filter((acc) => acc.provider === 'youtube')[0];
  if (!youtubeToken) {
    clip.youtubeStatus = 'FAILED_YOUTUBE_TOKEN';
    return { error: true, clip };
  } else {
    console.log('ready to upload to youtube');
    const currentClip = {
      title: clip.youtubeTitle || clip.title,
      clipURL: clip.renderedUrl,
      privacy: clip.youtubePrivacy,
      youtubeDescription: clip.description || undefined,
      youtubeCategory: clip.youtubeCategory || 'Gaming',
    };
    console.log('refreshing token');
    const refreshToken = await refreshYoutubeToken(youtubeToken);

    console.log(refreshToken);

    if (!refreshToken?.refresh_token || !refreshToken?.access_token) {
      console.log('token error');
      clip.youtubeUploaded = false;
      clip.youtubeStatus = 'FAILED_SCHEDULED_UPLOAD_REFRESH_TOKEN';
      return { error: true, clip };
    }

    //Update db with new token
    const accountData = {
      type: 'oauth',
      provider: 'youtube',
      refresh_token: refreshToken.refresh_token,
      access_token: refreshToken.access_token,
      expires_at: refreshToken.expiry_date,
      token_type: 'Bearer',
      scope: refreshToken.scope,
    };

    const updatedAccount = await updateAccount({
      userId: clip.userId.toString(),
      ...accountData,
    });
    if (!updatedAccount?.ok) {
      console.log('token error');
      clip.youtubeUploaded = false;
      clip.youtubeStatus = 'FAILED_SCHEDULED_UPLOAD_REFRESH_TOKEN_UPDATE';
      return { error: true, clip };
    }

    // upload to YT
    let clientSecret = YOUTUBE_SECRETS.web.client_secret;
    let clientId = YOUTUBE_SECRETS.web.client_id;
    let redirectUrl = YOUTUBE_SECRETS.web.redirect_uris[0];
    let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    oauth2Client.credentials = updatedAccount.value!;

    console.log('uploading to yt...');
    try {
      await uploadVideoToYoutube(oauth2Client, currentClip);
      console.log(`${clip.videoId} uploaded to youtube`);
      // set yt fields
      clip.youtubeUploaded = true;
      clip.youtubeUploadTime = new Date(new Date().toUTCString());
      clip.youtubeStatus = 'SUCCESS_SCHEDULED_UPLOAD';

      return { error: false, clip };
    } catch (error) {
      console.log(error);
      clip.youtubeUploaded = false;
      clip.youtubeStatus = 'FAILED_SCHEDULED_UPLOAD_ERROR';
      return { error: true, clip };
    }
  }
};

const uploadToTiktok = async (clip: ClipWithIdMongo, accounts: TAccount[]) => {
  console.log('Upload to tiktok start...');
  const tiktokToken = accounts?.filter((acc) => acc.provider === 'tiktok')[0];
  if (!tiktokToken) {
    clip.tiktokStatus = 'FAILED_TIKTOK_TOKEN';
    console.log('tiktok refresh failed');
    return { error: true, clip };
  } else {
    //refresh tiktok token
    let url_refresh_token = 'https://open-api.tiktok.com/oauth/refresh_token/';
    url_refresh_token += '?client_key=' + process.env.TIKTOK_CLIENT_KEY;
    url_refresh_token += '&grant_type=refresh_token';
    url_refresh_token += '&refresh_token=' + tiktokToken.refresh_token!.replace(/#/g, '%23');

    const res = await axios.post(url_refresh_token);
    const refreshToken = await res.data.data;

    if (refreshToken.error_code > 0) {
      console.error('ERROR: failed to get tiktok refresh token');
      clip.tiktokUploaded = false;
      clip.tiktokStatus = 'FAILED_SCHEDULED_UPLOAD_REFRESH_TOKEN';
      return { error: true, clip };
    }

    const accountData = {
      type: 'oauth',
      provider: 'tiktok',
      providerAccountId: refreshToken.open_id,
      refresh_token: refreshToken.refresh_token ?? null,
      refresh_expires_at: refreshToken.refresh_expires_in,
      access_token: refreshToken.access_token ?? null,
      expires_at: refreshToken.expires_in ?? null,
      token_type: 'Bearer',
      scope: refreshToken.scope,
    };

    const updatedAccount = await updateAccount({
      userId: clip.userId.toString(),
      ...accountData,
    });

    if (!updatedAccount?.ok) {
      console.log('token error');
      clip.tiktokUploaded = false;
      clip.tiktokStatus = 'FAILED_SCHEDULED_UPLOAD_REFRESH_TOKEN';
      return { error: true, clip };
    }

    // data for tiktok api
    const tokenData = {
      ...updatedAccount.value,
      open_id: updatedAccount.value?.providerAccountId,
    };

    // upload to tiktok
    console.log('uploading to tiktok...');
    try {
      let output = await uploadVideoToTiktok(JSON.stringify(tokenData), clip.renderedUrl!);
      // set tiktok fields
      clip.tiktokUploaded = true;
      clip.tiktokUploadTime = new Date(new Date().toUTCString());
      clip.tiktokStatus = 'SUCCESS_SCHEDULED_UPLOAD';
      return { error: false, clip };
    } catch (error) {
      clip.tiktokUploaded = false;
      clip.tiktokStatus = 'FAILED_SCHEDULED_UPLOAD';
      return { error: true, clip };
    }
  }
};
