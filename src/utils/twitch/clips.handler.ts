import apiClientConnect from './apiClient';
import { ClipManualWithUserId } from '../../api/crop/crop.model';
import { UserWithAccountsAndSettingsWithId } from '../../api/user/user.model';
import { clipLatestQueue, clipQueue, MAX_RETRIES, RETRY_DELAY } from '../../queues/clip.queue';
import log from '../logger';
import { updateUserDefaultClipsById } from '../../service/User';

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

export const previousXDays = (days = 14, startDate?: string) => {
  const start = startDate ? new Date(startDate) : new Date();
  const priorDate = start.setDate(start.getDate() - days);
  const ISO = new Date(priorDate).toISOString();

  return ISO;
};

export const addToGetAllClipsQueue = async (userId: string, broadcasterId: string) => {
  try {
    await updateUserDefaultClipsById(userId, 'inqueue');
    await clipQueue.add(
      'getAll',
      { userId, broadcasterId },
      {
        attempts: MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: RETRY_DELAY,
        },
      }
    );
  } catch (error) {
    log('error', 'failed to add user to clips queue', error);
  }
};

export const addToGetLatestClipsQueue = async (userId: string, broadcasterId: string) => {
  try {
    await clipLatestQueue.add(
      'getLatest',
      { userId, broadcasterId },
      {
        attempts: MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: RETRY_DELAY,
        },
      }
    );
  } catch (error) {
    log('error', 'failed to add user to clips queue', error);
  }
};

export const previous14Date = (startDate?: string) => {
  const start = startDate ? new Date(startDate) : new Date();
  const priorDate = start.setDate(start.getDate() - 14);
  const ISO = new Date(priorDate).toISOString();

  return ISO;
};

const daysOfYearArray = (mostRecentClipPostedCreatedAtTime: string) => {
  const now = new Date();
  const nextDate = new Date().setDate(now.getDate() + 1);
  const tomorrow = new Date(nextDate);
  const daysOfYear = [];
  for (
    let d = new Date(mostRecentClipPostedCreatedAtTime);
    d <= tomorrow;
    d.setDate(d.getDate() + 1)
  ) {
    daysOfYear.push(new Date(d));
  }
  return daysOfYear;
};
const fixTheFreakingNames = (clips: TwurpleClip[], userId: string): ClipManualWithUserId[] =>
  clips.map((clip) => ({
    twitch_id: clip.id,
    userId,
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
    download_url: `${clip.thumbnailUrl.split('-preview-')[0]}.mp4`,
  }));

const sortClipsByCreationDate = (clips: ClipManualWithUserId[]) =>
  clips.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));

const filterClipsByCurrentSettings = (clips: ClipManualWithUserId[]) =>
  clips
    .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
    .filter((x) => x.created_at > new Date(2010, 0, 1).toISOString())
    .map((clipBlob) => ({
      ...clipBlob,
      download_url: `${clipBlob.thumbnail_url.split('-preview-')[0]}.mp4`,
    }));

export const getClipsStartingAtCertainDateFromTwitchAPI = async (
  broadcasterId: string,
  user: UserWithAccountsAndSettingsWithId,
  date?: string,
  doSort: boolean = true
) => {
  const daysAgo = previousXDays(3);
  const oldestClipDate =
    user?.settings?.lastUploaded && daysAgo > new Date(user.settings.lastUploaded).toISOString()
      ? new Date(user.settings.lastUploaded).toISOString()
      : daysAgo;

  const mostRecentClipPostedCreatedAtTime =
    date || (user?.settings?.lastUploaded ? oldestClipDate : new Date(2010, 0, 1).toISOString());

  const daysOfYear = daysOfYearArray(mostRecentClipPostedCreatedAtTime);

  const clips: TwurpleClip[] = [];

  let jumpSize = 1;
  let lastEndDateIndex = 0;
  for (let i = jumpSize; i < daysOfYear.length; i = Math.min(i + jumpSize, daysOfYear.length - 1)) {
    let startDate =
      daysOfYear[lastEndDateIndex] > daysOfYear[i - jumpSize + 1]
        ? daysOfYear[lastEndDateIndex]
        : daysOfYear[i - jumpSize + 1];
    if (lastEndDateIndex === 0) {
      [startDate] = daysOfYear;
    }
    const endDate = new Date(daysOfYear[i]);
    endDate.setUTCHours(
      endDate.getUTCHours() + 23,
      endDate.getUTCMinutes() + 59,
      endDate.getUTCSeconds() + 59,
      endDate.getUTCMilliseconds() + 999
    );

    // eslint-disable-next-line no-await-in-loop
    const api = await apiClientConnect(user);

    if (api === undefined) {
      log('warn', 'API is undefined, getting no new clips');
      return [];
    }

    let newClips = [];

    // eslint-disable-next-line no-await-in-loop
    newClips = await api.clips
      .getClipsForBroadcasterPaginated(broadcasterId, {
        limit: 100000,
        startDate, // whichever is later in life to avoid overlap
        endDate,
      })
      .getAll();

    if (newClips.length > 900) {
      i -= jumpSize;
      jumpSize = 2;
      // eslint-disable-next-line no-continue
      continue;
    } else {
      lastEndDateIndex = i + 1;
      jumpSize += 1;
    }
    clips.push(newClips);

    if (i === daysOfYear.length - 1) {
      break;
    }
  }

  let recentClips: TwurpleClip[] = clips.flatMap((x) => x); // clips.data.data;

  if (recentClips.length === 0) {
    return [];
  }
  const uniqueIds = new Set(recentClips.map((x) => x.id));
  recentClips = recentClips.filter((x) => uniqueIds.has(x.id));
  let fixedRecentClips = fixTheFreakingNames(recentClips, user.id.toString()); // i hate libraries

  // we mostly do this so we force in the download_url field
  if (doSort) {
    fixedRecentClips = filterClipsByCurrentSettings(fixedRecentClips);
  } else {
    fixedRecentClips = sortClipsByCreationDate(fixedRecentClips);
  }

  return fixedRecentClips;
};
