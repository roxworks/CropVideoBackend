import { google, Auth } from 'googleapis';
const service = google.youtube('v3');
import got from 'got';
import { CurrentClip } from '../src/api/crop/crop.model';
import { bufferToStream, stream2buffer } from './streamUtils';

const youtubeCategoriesToIds: { [key: string]: number } = {
  'Film & Animation': 1,
  'Autos & Vehicles': 2,
  Music: 10,
  'Pets & Animals': 15,
  Sports: 17,
  'Short Movies': 18,
  'Travel & Events': 19,
  Gaming: 20,
  Videoblogging: 21,
  'People & Blogs': 22,
  Comedy: 23,
  Entertainment: 24,
  'News & Politics': 25,
  'Howto & Style': 26,
  Education: 27,
  'Science & Technology': 28,
  'Nonprofits & Activism': 29,
};

export const uploadVideoToYoutube = async (auth: Auth.OAuth2Client, currentClip: CurrentClip) => {
  console.log(currentClip);
  let privacy = currentClip?.youtubePrivacy || 'private';
  let adjustedTitle = currentClip?.title || 'ClipbotTV video';

  const category = currentClip?.youtubeCategory;
  const fileStream = got.stream(currentClip?.clipURL!);
  const getBuffer = await stream2buffer(fileStream);
  const finalStream = bufferToStream(getBuffer);

  // console.log(Object.keys(fileStream.body));
  return new Promise((resolve, reject) => {
    console.log('trying to upload');
    service.videos.insert(
      {
        auth: auth,
        part: ['snippet', 'contentDetails', 'status'],
        requestBody: {
          // Video title and description
          snippet: {
            title: adjustedTitle,
            description:
              currentClip?.youtubeDescription || currentClip?.description || 'Video Description',
            categoryId: category ? youtubeCategoriesToIds[category].toString() : '20',
          },
          // I set to public because we're in prod!
          status: {
            privacyStatus: privacy,
          },
        },
        // Create the readable stream to upload the video
        media: {
          body: finalStream,
          mimeType: 'video/mp4',
        },
      },
      (error, data) => {
        if (error) {
          console.log('error uploading');
          console.log(error.message);
          reject(error);
          return;
        }

        console.log('upload complete');
        resolve('https://www.youtube.com/watch?v=' + data?.data?.id);
        return;
      }
    );
  });
};
