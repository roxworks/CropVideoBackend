import { z } from 'zod';
import { cropSettingsSchema, platformsSchema } from '../api/crop/crop.model';
import { ObjectId } from 'mongodb';
import { CropTemplate } from './CropTemplate';

const scheduleDays = z
  .object({
    sun: z.array(z.string()),
    mon: z.array(z.string()),
    tue: z.array(z.string()),
    wed: z.array(z.string()),
    thu: z.array(z.string()),
    fri: z.array(z.string()),
    sat: z.array(z.string())
  })
  .optional()
  .nullable();

export const TSettings = z.object({
  userId: z.instanceof(ObjectId),
  delay: z.number().optional().default(24),
  minViewCount: z.number().optional().default(10),
  uploadFrequency: z.number().optional().default(12),
  license: z.string().optional().nullable(),
  camCrop: cropSettingsSchema.optional().nullable(),
  screenCrop: cropSettingsSchema.optional().nullable(),
  cropType: z.enum(['no-cam', 'cam-top', 'cam-freeform', 'freeform']).optional().nullable(),
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
  youtubeCategory: z.string().optional(),
  youtubeDescription: z.string().optional().nullable(),
  instagramCaption: z.string().optional().nullable(),
  lastUploaded: z.date().optional().nullable(),
  lastUploadedId: z.string().optional().nullable(),
  lastUploadTiktok: z.date().optional().nullable(),
  lastUploadYoutube: z.date().optional().nullable(),
  lastUploadInstagram: z.date().optional().nullable(),
  lastUploadedClipYouTube: z.string().optional().nullable(),
  lastUploadedClipTiktok: z.string().optional().nullable(),
  lastUploadedClipInstagram: z.string().optional().nullable(),
  uploadCount: z.number().optional().default(0),
  selectedPlatforms: z
    .array(z.enum(['youtube', 'tiktok', 'instagram']))
    .optional()
    .nullable(),
  youtubeCount: z.number().optional().default(0),
  tiktokCount: z.number().optional().default(0),
  instagramCount: z.number().optional().default(0),
  approveDate: z.date().optional().nullable(),
  timeOffset: z.number().optional().nullable(),
  scheduleDays: scheduleDays
});

export const SettingsOutput = z.object({
  id: z.string(),
  userId: z.string(),
  delay: z.number().default(24),
  hastags: z.string().nullable(),
  minViewCount: z.number().default(10),
  uploadFrequency: z.number().default(8),
  license: z.string().nullable(),
  camCrop: cropSettingsSchema.nullable(),
  screenCrop: cropSettingsSchema.nullable(),
  cropType: z.string().nullable(),
  verticalVideoEnabled: z.boolean().default(true),
  uploadEnabled: z.boolean().default(false),
  defaultApprove: z.boolean().default(false),
  approveDate: z.date().nullable(),
  mainTutorialComplete: z.boolean().default(false),
  clipsTutorialComplete: z.boolean().default(false),
  youtubeHashtags: z.array(z.string()),
  youtubeTags: z.string().nullable(),
  youtubePrivacy: z.string().default('private'),
  youtubeAutoCategorization: z.boolean().default(true),
  youtubeCategory: z.string().default('Gaming').nullable(),
  youtubeDescription: z.string().nullable(),
  instagramCaption: z.string().nullable(),
  lastUploaded: z.date().nullable(),
  lastUploadedId: z.string().nullable(),
  lastUploadTiktok: z.date().nullable(),
  lastUploadYoutube: z.date().nullable(),
  lastInstagramYoutube: z.date().nullable(),
  lastUploadedClipYouTube: z.string().nullable(),
  lastUploadedClipTiktok: z.string().nullable(),
  lastUploadedClipInstagram: z.string().nullable(),
  uploadCount: z.number().default(0),
  selectedPlatforms: z.array(z.string()),
  youtubeCount: z.number().default(0),
  tiktokCount: z.number().default(0),
  instagramCount: z.number().default(0),
  timeOffset: z.number().nullable(),
  scheduleDays: scheduleDays.nullable(),
  instagramHashtags: z.array(z.string())
});

type scheduleDays = z.TypeOf<typeof scheduleDays>;
export type TSettings = z.TypeOf<typeof TSettings>;
export type SettingsOutput = z.TypeOf<typeof SettingsOutput>;
