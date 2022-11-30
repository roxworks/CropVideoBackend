/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from 'zod';

// axios sending number as string

export const platformsSchema = z.enum(['TikTok', 'YouTube', 'Instagram', 'Facebook']);
export const YoutubePrivacy = z.enum(['Public', 'Unlisted', 'Private']);

export const CropSettingsAxios = z.object({
  x: z.number().or(z.string()),
  y: z.number().or(z.string()),
  width: z.number().or(z.string()),
  height: z.number().or(z.string()),
  scaleX: z.number().or(z.string()).nullable().optional(),
  scaleY: z.number().or(z.string()).nullable().optional(),
  isNormalized: z.boolean().optional()
});

export const CropDataAxios = z.object({
  camCrop: CropSettingsAxios.optional().nullable(),
  screenCrop: CropSettingsAxios,
  cropType: z.enum(['no-cam', 'cam-top', 'cam-freeform', 'freeform']),
  startTime: z.union([z.number().optional(), z.string().optional()]).optional().nullable(),
  endTime: z.union([z.number(), z.string()]).optional().nullable()
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
  cropData: CropDataAxios,
  caption: z.string().optional().nullable(),
  youtubeTitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  renderedUrl: z.string().optional().nullable()
});

export const ClipWithId = Clip.extend({ id: z.string() });

export const ScheduledClipsArray = z.object({
  scheduledClips: z.array(ClipWithId)
});

export type Clip = z.infer<typeof Clip>;
export type ClipWithId = z.infer<typeof ClipWithId>;
export type ScheduledClipsArray = z.infer<typeof ScheduledClipsArray>;
export type CropData = z.infer<typeof CropDataAxios>;
