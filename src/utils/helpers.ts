import { TwitchClip } from '@prisma/client';
import { Clip, ClipStatuses, CropData, platformsSchema } from '../api/crop/crop.model';
import { CropTemplate } from '../interfaces/CropTemplate';
import { TSettings } from '../interfaces/Settings';

export function exclude<T, Key extends keyof T>(list: T, ...keys: Key[]): Omit<T, Key> {
  const newList = { ...list };
  for (const key of keys) {
    delete newList[key];
  }
  return newList;
}

export const convertTags = (tags: string[]) => tags.map((tag) => `%23${tag}`).join(' ');
type CropDataInput = {
  cropTemplate: CropTemplate;
  clipCropData?: CropTemplate;
  startTime?: number;
  endTime?: number;
};
export const convertToCropData = ({
  cropTemplate,
  clipCropData,
  startTime,
  endTime,
}: CropDataInput): CropData => ({
  camCrop: (clipCropData && clipCropData.camCrop) || cropTemplate.camCrop || null,
  screenCrop: clipCropData?.screenCrop || cropTemplate.screenCrop,
  cropType: clipCropData?.cropType || cropTemplate.cropType,
  startTime: typeof startTime === 'number' ? startTime : null,
  endTime: typeof endTime === 'number' ? endTime : null,
});

type convertTwitchClipToClip = {
  clip: TwitchClip;
  settings: TSettings;
  scheduleTime?: string;
  caption: string;
  cropData: CropData;
  approved?: boolean;
  status?: ClipStatuses;
  uploaded?: boolean;
};

export const convertToClipFromTwitchClip = ({
  clip,
  settings,
  scheduleTime,
  caption,
  cropData,
  approved = false,
  status = 'SCHEDULED',
  uploaded = false,
}: convertTwitchClipToClip): Clip => ({
  userId: clip.userId,
  broadcasterName: clip.broadcaster_name,
  broadcasterId: clip.broadcaster_id,
  creatorName: clip.creator_name,
  creatorId: clip.creator_id,
  embedUrl: clip.embed_url,
  gameId: clip.game_id,
  language: clip.language,
  title: clip.title,
  url: clip.url,
  videoId: clip.video_id,
  twitch_id: clip.twitch_id,
  viewCount: clip.view_count,
  thumbnailUrl: clip.thumbnail_url,
  createdAt: new Date(clip.created_at),
  downloadUrl: clip.download_url,
  approved,
  status,
  uploadPlatforms: convertPlatformString(settings.selectedPlatforms!),
  scheduledUploadTime: scheduleTime ? new Date(scheduleTime) : null,
  uploaded,
  caption,
  youtubeTitle: clip.youtubeTitle || clip.title,
  youtubeCategory: clip.youtubeCategory || settings.youtubeCategory || 'Gaming',
  description: (clip.youtubeDescription || settings.youtubeDescription) ?? null,
  cropData,
  youtubePrivacy: clip.youtubePrivacy || settings.youtubePrivacy,
  facebookDescription: clip.facebookDescription || clip.title,
  autoCaption: settings.autoCaption || false,
});

type LowerPlatforms = ('tiktok' | 'youtube' | 'instagram' | 'facebook')[];
export const convertPlatformString = (platforms: LowerPlatforms): platformsSchema[] => {
  const map = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    facebook: 'Facebook',
  };

  const updatedArray = platforms.map((platform) => map[platform]) as platformsSchema[];

  return updatedArray;
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
