import { z } from 'zod';
import { WithId } from 'mongodb';

export const JobId = z.object({
  id: z.string(),
});

export const platformsSchema = z.enum(['TikTok', 'YouTube', 'Instagram']);
export const YoutubePrivacy = z.enum(['Public', 'Unlisted', 'Private']);

export const cropSettingsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
  isNormalized: z.boolean().optional(),
});

export const CropData = z.object({
  camCrop: cropSettingsSchema.optional(),
  screenCrop: cropSettingsSchema,
  cropType: z.enum(['no-cam', 'cam-top', 'cam-freeform', 'freeform']),
  startTime: z.number(),
  endTime: z.number(),
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
  id: z.string(),
  language: z.string(),
  thumbnail_url: z.string(),
  title: z.string(),
  url: z.string(),
  video_id: z.string().optional(),
  view_count: z.number(),
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
  viewCount: z.number(),
  thumbnailUrl: z.string(),
  createdAt: z.string(),
  downloadUrl: z.string(),
  approved: z.boolean().default(false),
  status: z.string(),
  uploadPlatforms: z.array(platformsSchema),
  uploadTime: z.string().optional().nullable(),
  scheduledUploadTime: z.string().optional().nullable(),
  uploaded: z.boolean().default(false),
  youtubeUploadTime: z.string().optional().nullable(),
  youtubeStatus: z.string().optional().nullable(),
  tiktokUploaded: z.boolean(),
  tiktokUploadTime: z.string().optional().nullable(),
  tiktokStatus: z.string().optional().nullable(),
  instagramUploaded: z.boolean(),
  instagramUploadTime: z.string().optional().nullable(),
  instagramStatus: z.string().optional().nullable(),
  youtubePrivacy: z.string(YoutubePrivacy).default('Private'),
  cropData: CropData,
  caption: z.string().optional().nullable(),
  youtubeTitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  renderedUrl: z.string().optional(),
});

export const ClipWithId = Clip.extend({ id: z.string() });

export const ScheduledClipsArray = z.object({
  scheduledClips: z.array(ClipWithId),
});

export const RenderClipReq = z.object({
  clip: ClipManual,
  cropData: CropData,
});

export type JobId = z.infer<typeof JobId>;
export type Clip = z.infer<typeof Clip>;
export type ClipManual = z.infer<typeof ClipManual>;
export type ClipWithId = z.infer<typeof ClipWithId>;
export type ScheduledClipsArray = z.infer<typeof ScheduledClipsArray>;
export type CropData = z.infer<typeof CropData>;
export type RenderClipReq = z.infer<typeof RenderClipReq>;
