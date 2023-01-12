/* eslint-disable no-redeclare */
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime';

export const JobId = z.object({
  id: z.string(),
});

export const cropTypeEnum = z.enum(['NO_CAM', 'CAM_TOP', 'CAM_FREEFORM', 'FREEFORM']);
export const platformsSchema = z.enum(['TikTok', 'YouTube', 'Instagram', 'Facebook']);
export const YoutubePrivacy = z.enum(['Public', 'Unlisted', 'Private']);
export const ClipStatuses = z.enum([
  'SCHEDULED',
  'RENDERED',
  'FAILED_SCHEDULED_UPLOAD_INVALID_DATA',
  'FAILED_SCHEDULED_UPLOAD_ACCOUNT_NOT_FOUND',
  'FAILED_SCHEDULED_UPLOAD',
  'SUCCESS_SCHEDULED_UPLOAD',
  'SUCCESS_MANUAL_UPLOAD',
  'FAILED_MANUAL_UPLOAD',
]);

export const cropSettingsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  scaleX: z.number().nullable().optional(),
  scaleY: z.number().nullable().optional(),
  isNormalized: z.boolean().default(true),
});
export const cropSettingsSchemaOutput = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  scaleX: z.number().nullable(),
  scaleY: z.number().nullable(),
  isNormalized: z.boolean().default(true),
});

export const CropData = z.object({
  camCrop: cropSettingsSchema.nullable(),
  screenCrop: cropSettingsSchema,
  cropType: cropTypeEnum,
  startTime: z.number().nullable(),
  endTime: z.number().nullable(),
});
export const CropDataInput = z.object({
  camCrop: cropSettingsSchema.nullable().optional(),
  screenCrop: cropSettingsSchema,
  cropType: cropTypeEnum,
  startTime: z.instanceof(Decimal).or(z.number()).optional().nullable(),
  endTime: z.instanceof(Decimal).or(z.number()).optional().nullable(),
});

export const ClipManual = z.object({
  broadcaster_name: z.string(),
  broadcaster_id: z.string(),
  created_at: z.string(),
  creator_name: z.string(),
  creator_id: z.string(),
  download_url: z.string(),
  embed_url: z.string(),
  game_id: z.string(),
  twitch_id: z.string(),
  language: z.string(),
  thumbnail_url: z.string(),
  title: z.string(),
  url: z.string(),
  video_id: z.string().default(''),
  view_count: z.number(),
  autoCaption: z.boolean().optional(),
});

export const Clip = z.object({
  userId: z.string(),
  broadcasterName: z.string(),
  broadcasterId: z.string(),
  creatorName: z.string(),
  creatorId: z.string(),
  embedUrl: z.string(),
  gameId: z.string(),
  language: z.string(),
  title: z.string(),
  url: z.string(),
  videoId: z.string(),
  twitch_id: z.string(),
  viewCount: z.number(),
  thumbnailUrl: z.string(),
  createdAt: z.date(),
  downloadUrl: z.string(),
  approved: z.boolean().default(false),
  status: ClipStatuses,
  uploadPlatforms: z.array(platformsSchema),
  uploadTime: z.string().optional().nullable(),
  scheduledUploadTime: z.date().optional().nullable(),
  uploaded: z.boolean().default(false),
  youtubeUploaded: z.boolean().default(false).optional(),
  youtubeUploadTime: z.string().or(z.date()).optional().nullable(),
  youtubeStatus: z.string().optional().nullable(),
  tiktokUploaded: z.boolean().default(false).optional(),
  tiktokUploadTime: z.string().or(z.date()).optional().nullable(),
  tiktokStatus: z.string().optional().nullable(),
  instagramUploaded: z.boolean().default(false).optional(),
  instagramUploadTime: z.string().or(z.date()).optional().nullable(),
  instagramStatus: z.string().optional().nullable(),
  facebookUploaded: z.boolean().default(false).optional(),
  facebookUploadTime: z.string().or(z.date()).optional().nullable(),
  facebookStatus: z.string().optional().nullable(),
  youtubePrivacy: z.string(YoutubePrivacy).default('Private'),
  youtubeCategory: z.string().optional().nullable(),
  cropData: CropData,
  caption: z.string().optional().nullable(),
  youtubeTitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  renderedUrl: z.string().optional(),
  facebookDescription: z.string().optional().nullable(),
  updatedAt: z.date().optional(),
  autoCaption: z.boolean().optional(),
});

export const CurrentClip = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  privacy: z.string().optional(),
  youtubePrivacy: z.string().optional(),
  youtubeCategory: z.string().optional(),
  youtubeDescription: z.string().optional(),
  clipURL: z.string().optional(),
});

export const ClipWithId = Clip.extend({ id: z.string() });

export const categories = z.enum([
  'Film & Animation',
  'Autos & Vehicles',
  'Music',
  'Pets & Animals',
  'Sports',
  'Travel & Events',
  'Gaming',
  'People & Blogs',
  'Comedy',
  'Entertainment',
  'News & Politics',
  'Howto & Style',
  'Education',
  'Science & Technology',
  'Nonprofits & Activism',
]);

export const ClipManualWithUserId = ClipManual.extend({
  userId: z.string(),
  uploaded: z.boolean().optional(),
  uploadPlatforms: z.array(z.enum(['tiktok', 'youtube', 'instagram'])).optional(),
  approved: z.boolean().optional(),
  approvedStatus: z.enum(['AUTO_APPROVE', 'MANUAL_APPROVE', 'CANCELED']).optional(),
  scheduled: z.boolean().optional(),
  cropType: cropTypeEnum.optional(),
  youtubeHashtags: z.array(z.string()).optional(),
  youtubeDescription: z.string().optional().nullable(),
  youtubePrivacy: z.enum(['public', 'unlisted', 'private']).optional(),
  youtubeCategory: categories.optional(),
  youtubeTitle: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  instagramHashtags: z.array(z.string()).optional(),
  facebookDescription: z.string().optional().nullable(),
  startTime: z.number().optional().nullable(),
  endTime: z.number().optional().nullable(),
});

export const ScheduledClipsArray = z.object({
  scheduledClips: z.array(ClipWithId),
});

export const RenderClipReq = z.object({
  clip: ClipManual.extend({
    userId: z.string(),
    id: z.string().optional(),
    downloadUrl: z.string().optional(),
  }),
  cropData: CropDataInput,
});

export type JobId = z.infer<typeof JobId>;
export type Clip = z.infer<typeof Clip>;
export type CurrentClip = z.infer<typeof CurrentClip>;
export type ClipManual = z.infer<typeof ClipManual>;
export type ClipWithId = z.infer<typeof ClipWithId>;
export type ScheduledClipsArray = z.infer<typeof ScheduledClipsArray>;
export type CropData = z.infer<typeof CropData>;
export type RenderClipReq = z.infer<typeof RenderClipReq>;
export type ClipManualWithUserId = z.infer<typeof ClipManualWithUserId>;
export type platformsSchema = z.infer<typeof platformsSchema>;
export type ClipStatuses = z.infer<typeof ClipStatuses>;
export type CropSettingsSchema = z.infer<typeof cropSettingsSchema>;
export type cropSettingsSchemaOutput = z.infer<typeof cropSettingsSchemaOutput>;
export type CropDataInput = z.infer<typeof CropDataInput>;

export type ClipWithRenderedUrl = ClipWithId & { renderedUrl: string };
