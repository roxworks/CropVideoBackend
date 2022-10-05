import { apiClientConnect } from './apiClient';
import { ClipManual, ClipManualWithUserId } from '../../api/crop/crop.model';
import { UserWithAccountsAndSettingsWithId } from '../../api/user/user.model';
import { HelixClip } from '@twurple/api/lib';
import { clipQueue } from '../../queues/clip.queue';

type TwurpleClip = {
  id: string;
  broadcasterDisplayName: string;
  broadcasterId: string;
  creatorDisplayName: string;
  creatorId: string;
  embedUrl: string;
  gameId: string;
  language: string;
  title: string;
  url: string;
  videoId: string;
  views: number;
  thumbnailUrl: string;
  creationDate: Date;
};

export const testAddToClipQueue = async () => {
  try {
    console.log('Adding jobs...');
    for (let i = 0; i < 3; i++) {
      await clipQueue.add('my-job', { foo: 'bar' });
    }
    console.log('added clips');
  } catch (error) {
    console.log(error);
  }
};

export const addToGetAllClipsQueue = async (userId: string, broadcasterId: string) => {
  try {
    console.log('inside the clip queue add');
    await clipQueue.add('getAll', { userId, broadcasterId });
    console.log('getAllClips queue user: ', userId, broadcasterId);
  } catch (error) {
    console.log(error);
  }
};

export const previous14Date = (startDate?: string) => {
  const start = startDate ? new Date(startDate) : new Date();
  const priorDate = start.setDate(start.getDate() - 14);
  const ISO = new Date(priorDate).toISOString();

  return ISO;
};

const daysOfYearArray = (mostRecentClipPostedCreatedAtTime: string) => {
  let now = new Date();
  let nextDate = new Date().setDate(now.getDate() + 1);
  let tomorrow = new Date(nextDate);
  let daysOfYear = [];
  for (
    let d = new Date(mostRecentClipPostedCreatedAtTime);
    d <= tomorrow;
    d.setDate(d.getDate() + 1)
  ) {
    daysOfYear.push(new Date(d));
  }
  console.log('Day arr length: ' + daysOfYear.length);
  return daysOfYear;
};
const fixTheFreakingNames = (clips: TwurpleClip[], userId: string): ClipManualWithUserId[] => {
  return clips.map((clip) => {
    return {
      id: clip.id,
      userId: userId,
      broadcaster_name: clip.broadcasterDisplayName,
      broadcaster_id: clip.broadcasterId,
      creator_name: clip.creatorDisplayName,
      creator_id: clip.creatorId,
      embed_url: clip.embedUrl,
      game_id: clip.gameId,
      language: clip.language,
      title: clip.title,
      url: clip.url,
      video_id: clip.videoId,
      view_count: clip.views,
      thumbnail_url: clip.thumbnailUrl,
      created_at: clip.creationDate.toISOString(),
      download_url: clip.thumbnailUrl.split('-preview-')[0] + '.mp4'
    };
  });
};

const sortClipsByCreationDate = (clips: ClipManualWithUserId[]) => {
  return clips.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
};

const filterClipsByCurrentSettings = (clips: ClipManualWithUserId[]) => {
  return (
    clips
      .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
      // .filter((x) => x.created_at > getCurrentState()?.lastUploadCreatedAtDate)
      .filter((x) => x.created_at > new Date(2010, 0, 1).toISOString())
      .map((clipBlob) => {
        // convert thumbnail url to actual url
        clipBlob.download_url = clipBlob.thumbnail_url.split('-preview-')[0] + '.mp4';
        return clipBlob;
      })
  );
};

export const getClipsStartingAtCertainDateFromTwitchAPI = async (
  broadcasterId: string,
  user: UserWithAccountsAndSettingsWithId,
  date?: string,
  doSort: boolean = true
) => {
  user.settings[0].lastUploaded;
  console.log('gettin more clips');
  let mostRecentClipPostedCreatedAtTime = date
    ? date
    : user?.settings[0]?.lastUploaded
    ? new Date(user?.settings[0].lastUploaded).toISOString()
    : new Date(2010, 0, 1).toISOString();
  console.log('Most recent clip posted created at time: ' + mostRecentClipPostedCreatedAtTime);
  const daysOfYear = daysOfYearArray(mostRecentClipPostedCreatedAtTime);

  let clips: TwurpleClip[] = [];

  let jumpSize = 1;
  let lastEndDateIndex = 0;
  let totalClipsFoundSoFar = 0;
  for (let i = jumpSize; i < daysOfYear.length; i = Math.min(i + jumpSize, daysOfYear.length - 1)) {
    let startDate =
      daysOfYear[lastEndDateIndex] > daysOfYear[i - jumpSize + 1]
        ? daysOfYear[lastEndDateIndex]
        : daysOfYear[i - jumpSize + 1];
    if (lastEndDateIndex == 0) {
      startDate = daysOfYear[0];
    }
    let endDate = new Date(daysOfYear[i]);
    endDate.setUTCHours(
      endDate.getUTCHours() + 23,
      endDate.getUTCMinutes() + 59,
      endDate.getUTCSeconds() + 59,
      endDate.getUTCMilliseconds() + 999
    );
    const api = await apiClientConnect(user);

    if (api == undefined) {
      console.log('API is undefined, getting no new clips');
      return [];
    }

    let newClips = [];
    newClips = await api.clips
      .getClipsForBroadcasterPaginated(broadcasterId, {
        limit: 100000,
        startDate: startDate, //whichever is later in life to avoid overlap
        endDate: endDate
      })
      .getAll();

    console.log(
      `Clips from ${startDate.toISOString()} until ${endDate.toISOString()}:` + newClips.length
    );

    if (newClips.length > 900) {
      i -= jumpSize;
      jumpSize = 2;
      console.log('backing up');
      continue;
    } else {
      lastEndDateIndex = i + 1;
      jumpSize += 1;
    }
    clips.push(newClips);
    totalClipsFoundSoFar += newClips.length;
    // updateStatus('LOADING NEW TWITCH CLIPS: ' + totalClipsFoundSoFar)
    console.log(
      'Unique clips in twitch output: ' + new Set(newClips.map((x: TwurpleClip) => x.id)).size
    );

    if (i == daysOfYear.length - 1) {
      console.log('Got to end');
      break;
    }
  }

  console.log('Checked clips starting at: ' + mostRecentClipPostedCreatedAtTime);
  let recentClips: TwurpleClip[] = clips.flatMap((x) => x); //clips.data.data;

  if (recentClips.length == 0) {
    return [];
  }
  let uniqueIds = new Set(recentClips.map((x) => x.id));
  recentClips = recentClips.filter((x) => uniqueIds.has(x.id));
  let fixedRecentClips = fixTheFreakingNames(recentClips, user._id.toString()); // i hate libraries
  console.log('all clips length: ' + recentClips.length);

  // we mostly do this so we force in the download_url field
  if (doSort) {
    fixedRecentClips = filterClipsByCurrentSettings(fixedRecentClips);
  } else {
    fixedRecentClips = sortClipsByCreationDate(fixedRecentClips);
  }

  // updateStatus('Done finding clips')
  console.log('sorted clips length: ' + recentClips.length);
  console.log('new clip ids: ', uniqueIds);

  // fixedRecentClips = await saveClips(recentClips, user);

  return fixedRecentClips;
};
