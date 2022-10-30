import { z } from 'zod';
import { WithId } from 'mongodb';
import { cropSettingsSchema } from '../api/crop/crop.model';

export const CropTemplate = z.object({
  name: z.string(),
  settingId: z.string(),
  userId: z.string(),
  cropType: z.enum(['no-cam', 'cam-top', 'cam-freeform', 'freeform']),
  camCrop: cropSettingsSchema,
  screenCrop: cropSettingsSchema
});

export type CropTemplate = z.TypeOf<typeof CropTemplate>;
export type CropTemplateWithId = WithId<CropTemplate>;
