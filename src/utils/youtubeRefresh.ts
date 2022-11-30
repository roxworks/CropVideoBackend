import { google } from 'googleapis';
import { YTRefreshToken } from '../interfaces/YouTubeRefreshToken';
import log from './logger';
var OAuth2 = google.auth.OAuth2;
const YOUTUBE_SECRETS = JSON.parse(process.env.YOUTUBE_SECRETS || '{}');

const makeClient = (credentials: Object) => {
  var clientSecret = YOUTUBE_SECRETS.web.client_secret;
  var clientId = YOUTUBE_SECRETS.web.client_id;
  var redirectUrl = YOUTUBE_SECRETS.web.redirect_uris[0];
  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
  oauth2Client.setCredentials(credentials);
  return oauth2Client;
};

export const refreshYoutubeToken = async (credentials: Object): Promise<YTRefreshToken> => {
  var oauth2Client = makeClient(credentials);
  const clientToken = new Promise((resolve, reject) => {
    oauth2Client.refreshAccessToken(async function (err, token) {
      if (err) {
        log('info', 'Error while trying to retrieve access token', err, 'youtubeRefresh');
        reject(err);
        return;
      }
      if (token == null) {
        log('error', 'bad token');
        reject(
          'Looks like you may have put in a bad token: <br> ' +
            token +
            ' <br> Please try logging in to YouTube again'
        );
        return;
      }
      oauth2Client.credentials = token;
      resolve(token);
    });
  });

  const finalToken = await clientToken.catch((e) => {
    log('error', 'youtube-token caught rejection', e, 'youtubeRefresh');
    return { isRejected: true, error: e };
  });
  //@ts-ignore
  if (finalToken.isRejected) {
    log('error', 'youtube-token rip token', finalToken, 'youtubeRefresh');
    return finalToken as YTRefreshToken;
  }

  log('info', 'youtube-token got client token');

  return finalToken as YTRefreshToken;
};
