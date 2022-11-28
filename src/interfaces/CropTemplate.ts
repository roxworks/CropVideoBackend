import { z } from 'zod';
import { cropSettingsSchema } from '../api/crop/crop.model';

export const CropTemplate = z.object({
  name: z.string(),
  settingId: z.string(),
  userId: z.string(),
  cropType: z.enum(['no-cam', 'cam-top', 'cam-freeform', 'freeform']),
  camCrop: cropSettingsSchema,
  screenCrop: cropSettingsSchema
});

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type CropTemplate = z.TypeOf<typeof CropTemplate>;
