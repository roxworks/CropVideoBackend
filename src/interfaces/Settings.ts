import { z } from 'zod';
import { WithId } from 'mongodb';
import { cropSettingsSchema, platformsSchema } from '../api/crop/crop.model';
import { ObjectId } from 'mongodb';

export const TSettings = z.object({
  userId: z.instanceof(ObjectId),
  delay: z.number().optional().default(24),
  minViewCount: z.number().optional().default(10),
  uploadFrequency: z.number().optional().default(12),
  license: z.string().optional().nullable(),
  camCrop: cropSettingsSchema.optional().nullable(),
  screenCrop: cropSettingsSchema.optional().nullable(),
  cropType: z.string().optional().nullable(),
  verticalVideoEnabled: z.boolean().optional().default(true),
  uploadEnabled: z.boolean().optional().default(false),
  defaultApprove: z.boolean().optional().default(false),
  onbaordingComplete: z.boolean().optional().default(false),
  mainTutorialComplete: z.boolean().optional().default(false),
  clipsTutorialComplete: z.boolean().optional().default(false),
  youtubeHashtags: z.string().optional().nullable(),
  youtubeTags: z.string().optional().nullable(),
  youtubePrivacy: z.string().optional().default('private'),
  youtubeAutoCategorization: z.boolean().optional().default(true),
  youtubeDescription: z.string().optional().nullable(),
  instagramCaption: z.string().optional().nullable(),
  lastUploaded: z.date().optional().nullable(),
  lastUploadTiktok: z.date().optional().nullable(),
  lastUploadYoutube: z.date().optional().nullable(),
  lastUploadInstagram: z.date().optional().nullable(),
  lastUploadedClipYouTube: z.string().optional().nullable(),
  lastUploadedClipTiktok: z.string().optional().nullable(),
  lastUploadedClipInstagram: z.string().optional().nullable(),
  uploadCount: z.number().optional().default(0),
  selectedPlatforms: z.array(platformsSchema).optional().nullable(),
  youtubeCount: z.number().optional().default(0),
  tiktokCount: z.number().optional().default(0),
  instagramCount: z.number().optional().default(0)
});

export type TSettings = z.TypeOf<typeof TSettings>;
export type SettingsWithId = WithId<TSettings>;
