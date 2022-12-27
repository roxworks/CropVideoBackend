/* eslint-disable no-await-in-loop */
import { google } from 'googleapis';
import axios from 'axios';

import { Account } from '@prisma/client';
import { uploadVideoToYoutube } from '../utils/uploadToYoutube';
import { refreshYoutubeToken } from '../utils/youtubeRefresh';
import { updateAccount } from './Account';
import { getClipsReadyToUploaded, updateClip, updateTwitchClipUploaded } from './Clip';
import { getUserByIdWithAccountsAndSettings } from './User';
import { uploadVideoToTiktok } from '../utils/uploadToTiktok';
import { exclude } from '../utils/excludeClipId';
import log from '../utils/logger';
import { doFbUpload, doIGUpload } from '../utils/uploadToInstagram';
import { ClipWithRenderedUrl, CurrentClip } from '../api/crop/crop.model';

const { OAuth2 } = google.auth;
const YOUTUBE_SECRETS = JSON.parse(process.env.YOUTUBE_SECRETS || '{}');

const uploadClipsQueue = async (clips: ClipWithRenderedUrl[]) => {
  log('info', 'upload-clips-queue', { clips, length: clips.length }, 'uploadService');

  const successfulJobs: ClipWithRenderedUrl[] = [];
  const failedJobs: ClipWithRenderedUrl[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for (let job of clips) {
    log('info', 'upload-clip-job-id', job.videoId);

    try {
      // check for renderURL and useriD - if fail update db status
      if (!job.renderedUrl || !job.userId) {
        // update status in db
        const updateData = {
          ...job,
          uploaded: false,
          status: 'FAILED_SCHEDULED_UPLOAD_INVALID_DATA',
        };
        log('error', 'clip-queue missing data', updateData);

        // eslint-disable-next-line no-await-in-loop
        await updateClip(job.id.toString(), exclude(updateData, 'id'));
        failedJobs.push(job);
        // eslint-disable-next-line no-continue
        continue;
      }
      // get user with accounts
      const user = await getUserByIdWithAccountsAndSettings(job.userId.toString());
      const accounts = user?.accounts;
      if (!accounts) {
        // update status in db
        const updateData = {
          ...job,
          uploaded: false,
          status: 'FAILED_SCHEDULED_UPLOAD_ACCOUNT_NOT_FOUND',
        };

        log('error', 'users accounts not found', { user, updateData });
        await updateClip(job.id.toString(), exclude(updateData, 'id'));
        failedJobs.push(job);
        continue;
      }

      // upload to each platform
      const uploaded = await uploadToPlatforms(job, accounts);
      job = uploaded ?? job;

      successfulJobs.push(job);
    } catch (error) {
      log('error', 'upload fail', error);
      if (error instanceof Error) {
        log('error', 'upload fail', error.message);
      }
      failedJobs.push(job);
    }
  }
  log('info', 'Successful upload jobs', successfulJobs, 'uploadService');
  log('warn', 'Failed upload jobs', failedJobs, 'uploadService');
};

const uploadClip = async () => {
  try {
    // Get clips ready to upload
    const data = await getClipsReadyToUploaded();
    if (!data || data.count === 0) return log('info', 'No clips to upload');
    // add clips to upload queue
    await uploadClipsQueue(data.clips);
  } catch (error) {
    log('error', 'Error uploading clips', error, 'uploadService');
    if (error instanceof Error) {
      log('error', 'error uploadin clips', error.message);
    }
  }
};

const uploadToPlatforms = async (clip: ClipWithRenderedUrl, accounts: Account[]) => {
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
  //  upload to instagram
  if (clip.uploadPlatforms.includes('Instagram') && !clip.instagramUploaded) {
    const instagramUpload = await uploadInstagram(clip, accounts);
    if (instagramUpload.error) uploadError = true;
  }
  //  upload to instagram
  if (clip.uploadPlatforms.includes('Facebook') && !clip.facebookUploaded) {
    const instagramUpload = await uploadFacebook(clip, accounts);
    if (instagramUpload.error) uploadError = true;
  }

  // update db
  log('info', 'upload-to-platforms Updating clip in db', clip, 'uploadService');
  try {
    const updateData = {
      ...clip,
      uploaded: true,
      uploadTime: new Date(new Date().toUTCString()),
      status: uploadError ? 'FAILED_SCHEDULED_UPLOAD' : 'SUCCESS_SCHEDULED_UPLOAD',
    };

    log('info', 'before upload clip', updateData, 'uploadService');

    const updatedClip = await updateClip(clip.id.toString(), exclude(updateData, 'id'));
    await updateTwitchClipUploaded(clip.videoId, clip.userId.toString());

    return updatedClip;
  } catch (error) {
    log('error', 'upload-to-platforms upload failed', error, 'uploadService');
  }
};

const uploadToYoutube = async (clip: ClipWithRenderedUrl, accounts: Account[]) => {
  log('info', 'upload-to-youtube start');
  const youtubeToken = accounts?.filter((acc) => acc.provider === 'youtube')[0];
  if (!youtubeToken) {
    return { error: true, clip: { ...clip, youtubeStatus: 'FAILED_YOUTUBE_TOKEN' } };
  }
  log('info', 'upload-to-youtube ready to upload to youtube');
  const currentClip: CurrentClip = {
    title: clip.youtubeTitle || clip.title,
    clipURL: clip.renderedUrl,
    youtubePrivacy: clip.youtubePrivacy,
    youtubeDescription: clip.description || undefined,
    youtubeCategory: clip.youtubeCategory || 'Gaming',
  };
  log('info', 'upload-to-youtube', 'attempting to refresh token');
  const refreshToken = await refreshYoutubeToken(youtubeToken);

  if (!refreshToken?.refresh_token || !refreshToken?.access_token) {
    log('error', 'upload-to-youtube', 'refresh token failed');
    log('error', 'upload-to-youtube', refreshToken);
    return {
      error: true,
      clip: {
        ...clip,
        youtubeUploaded: false,
        youtubeStatus: 'FAILED_SCHEDULED_UPLOAD_REFRESH_TOKEN',
      },
    };
  }

  // Update db with new token
  const accountData = {
    type: 'oauth',
    provider: 'youtube',
    refresh_token: refreshToken.refresh_token,
    access_token: refreshToken.access_token,
    expires_at: parseInt(String(refreshToken.expiry_date / 1000)),
    token_type: 'Bearer',
    scope: refreshToken.scope,
  };

  const updatedAccount = await updateAccount({
    userId: clip.userId,
    ...accountData,
  });
  if (!updatedAccount) {
    log('error', 'update token in account error', updatedAccount, 'uploadService');

    const data: ClipWithRenderedUrl = {
      ...clip,
      youtubeUploaded: false,
      youtubeStatus: 'FAILED_SCHEDULED_UPLOAD_REFRESH_TOKEN_UPDATE',
    };
    return { error: true, clip: data };
  }

  // upload to YT
  const clientSecret = YOUTUBE_SECRETS.web.client_secret;
  const clientId = YOUTUBE_SECRETS.web.client_id;
  const redirectUrl = YOUTUBE_SECRETS.web.redirect_uris[0];
  const oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  const newCreds = {
    ...updatedAccount,
    scope: updatedAccount.scope ?? undefined,
  };

  oauth2Client.credentials = newCreds;

  log('info', 'uploading to yt...');
  try {
    await uploadVideoToYoutube(oauth2Client, currentClip);
    log('info', 'clip-uploaded-to-youtube', clip.videoId);
    // set yt fields

    const data: ClipWithRenderedUrl = {
      ...clip,
      youtubeUploaded: true,
      youtubeUploadTime: new Date(new Date().toUTCString()),
      youtubeStatus: 'SUCCESS_SCHEDULED_UPLOAD',
    };
    return { error: false, clip: data };
  } catch (error) {
    log('error', 'failed to upload clip to youtube', error);

    const data: ClipWithRenderedUrl = {
      ...clip,
      youtubeUploaded: false,
      youtubeStatus: 'FAILED_SCHEDULED_UPLOAD_ERROR',
    };
    return { error: true, clip: data };
  }
};

const uploadToTiktok = async (clip: ClipWithRenderedUrl, accounts: Account[]) => {
  log('info', 'upload-to-tiktok start');
  const tiktokToken = accounts?.filter((acc) => acc.provider === 'tiktok')[0];
  if (!tiktokToken) {
    log('error', 'tiktok token not found', clip, 'uploadService');
    const data: ClipWithRenderedUrl = {
      ...clip,
      tiktokStatus: 'FAILED_TIKTOK_TOKEN',
    };
    return { error: true, clip: data };
  }
  // refresh tiktok token
  let url_refresh_token = 'https://open-api.tiktok.com/oauth/refresh_token/';
  url_refresh_token += `?client_key=${process.env.TIKTOK_CLIENT_KEY}`;
  url_refresh_token += '&grant_type=refresh_token';
  url_refresh_token += `&refresh_token=${tiktokToken.refresh_token!.replace(/#/g, '%23')}`;

  const res = await axios.post(url_refresh_token);
  const refreshToken = await res.data.data;

  if (refreshToken.error_code > 0) {
    log('error', 'failed to get tiktok refresh token', refreshToken, 'uploadService');

    const data: ClipWithRenderedUrl = {
      ...clip,
      tiktokUploaded: false,
      tiktokStatus: 'FAILED_SCHEDULED_UPLOAD_REFRESH_TOKEN',
    };
    return { error: true, clip: data };
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
    userId: clip.userId,
    ...accountData,
  });

  if (!updatedAccount) {
    log('error', 'update token in account error', updatedAccount, 'uploadService');

    const data: ClipWithRenderedUrl = {
      ...clip,
      tiktokUploaded: false,
      tiktokStatus: 'FAILED_SCHEDULED_UPLOAD_REFRESH_TOKEN',
    };
    return { error: true, clip: data };
  }

  // data for tiktok api
  const tokenData = {
    ...updatedAccount,
    open_id: updatedAccount.providerAccountId,
  };

  // upload to tiktok
  log('info', 'attempting to upload to tiktok', clip.id);
  try {
    await uploadVideoToTiktok(JSON.stringify(tokenData), clip.renderedUrl!);
    // set tiktok fields
    const data: ClipWithRenderedUrl = {
      ...clip,
      tiktokUploaded: true,
      tiktokUploadTime: new Date(new Date().toUTCString()),
      tiktokStatus: 'SUCCESS_SCHEDULED_UPLOAD',
    };
    return { error: false, clip: data };
  } catch (error) {
    const data: ClipWithRenderedUrl = {
      ...clip,
      tiktokUploaded: false,
      tiktokStatus: 'FAILED_SCHEDULED_UPLOAD',
    };
    return { error: true, clip: data };
  }
};

const uploadInstagram = async (clip: ClipWithRenderedUrl, accounts: Account[]) => {
  log('info', 'upload-to-instagram start');
  const instagramToken = accounts?.filter((acc) => acc.provider === 'instagram')[0];
  if (!instagramToken || !instagramToken.access_token) {
    const data: ClipWithRenderedUrl = {
      ...clip,
      instagramStatus: 'FAILED_INSTAGRAM_TOKEN',
    };
    return { error: true, clip: data };
  }
  log('info', 'upload-to-instragram ready to upload to instagram');

  try {
    await doIGUpload(instagramToken.access_token, clip.renderedUrl!, clip.caption || clip.title);
    log('info', 'clip-uploaded-to-instagram', clip.videoId);
    // set yt fields
    const data: ClipWithRenderedUrl = {
      ...clip,
      instagramUploaded: true,
      instagramUploadTime: new Date(new Date().toUTCString()),
      instagramStatus: 'SUCCESS_SCHEDULED_UPLOAD',
    };
    return { error: false, clip: data };
  } catch (error) {
    log('error', 'failed to upload clip to instagram', error);

    const data: ClipWithRenderedUrl = {
      ...clip,
      instagramUploaded: false,
      instagramStatus: 'FAILED_SCHEDULED_UPLOAD_ERROR',
    };
    return { error: true, clip: data };
  }
};
const uploadFacebook = async (clip: ClipWithRenderedUrl, accounts: Account[]) => {
  log('info', 'upload-to-facebook start');
  const instagramToken = accounts?.filter((acc) => acc.provider === 'instagram')[0];
  if (!instagramToken || !instagramToken.pageAccessToken || !instagramToken.pageId) {
    const data: ClipWithRenderedUrl = {
      ...clip,
      facebookStatus: 'FAILED_FACEBOOK_TOKEN',
    };
    return { error: true, clip: data };
  }
  log('info', 'upload-to-facebook ready to upload to instagram');

  try {
    await doFbUpload(
      instagramToken.pageAccessToken,
      instagramToken.pageId,
      clip.renderedUrl!,
      clip.facebookDescription || clip.title
    );
    log('info', 'clip-upload-to-facebook', clip.videoId);
    // set yt fields
    const data: ClipWithRenderedUrl = {
      ...clip,
      facebookUploaded: true,
      facebookUploadTime: new Date(new Date().toUTCString()),
      facebookStatus: 'FAILED_FACEBOOK_TOKEN',
    };
    return { error: false, clip: data };
  } catch (error) {
    log('error', 'failed to upload clip to facebook', error);

    const data: ClipWithRenderedUrl = {
      ...clip,
      facebookUploaded: false,
      facebookStatus: 'FAILED_SCHEDULED_UPLOAD_ERROR',
    };
    return { error: true, clip: data };
  }
};

export default uploadClip;
