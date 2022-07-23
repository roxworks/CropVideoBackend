import { google } from 'googleapis';
var OAuth2 = google.auth.OAuth2;
const YOUTUBE_SECRETS = JSON.parse(process.env.YOUTUBE_SECRETS || '{}');

const makeClient = (credentials) => {
  var clientSecret = YOUTUBE_SECRETS.web.client_secret;
  var clientId = YOUTUBE_SECRETS.web.client_id;
  var redirectUrl = YOUTUBE_SECRETS.web.redirect_uris[0];
  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
  oauth2Client.setCredentials(credentials);
  return oauth2Client;
};

export const refreshYoutubeToken = async (credentials) => {
  var oauth2Client = makeClient(credentials);
  let clientToken = new Promise((resolve, reject) => {
    oauth2Client.refreshAccessToken(async function (err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        reject(err);
        return;
      }
      if (token == null) {
        console.log('bad token');
        reject(
          'Looks like you may have put in a bad token: <br> ' +
            token +
            ' <br> Please try logging in to YouTube again'
        );
        return;
      } else {
        console.log('setting new token:' + JSON.stringify(token));
      }
      oauth2Client.credentials = token;
      resolve(token);
    });
  });

  let finalToken = await clientToken.catch((e) => {
    console.log('caught rejection: ' + e);
    return { isRejected: true, error: e };
  });
  //@ts-ignore
  if (finalToken.isRejected) {
    console.log('rip token s', finalToken);
    return finalToken;
  }

  console.log('got client tokeN:' + JSON.stringify(finalToken));

  return finalToken;
};
