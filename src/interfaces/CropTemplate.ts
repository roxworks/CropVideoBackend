import { z } from 'zod';
import { cropSettingsSchemaOutput } from '../api/crop/crop.model';

export const CropTemplate = z.object({
  name: z.string(),
  settingId: z.string(),
  userId: z.string(),
  cropType: z.enum(['no-cam', 'cam-top', 'cam-freeform', 'freeform']),
  camCrop: cropSettingsSchemaOutput,
  screenCrop: cropSettingsSchemaOutput,
});

// eslint-disable-next-line no-redeclare
export type CropTemplate = z.TypeOf<typeof CropTemplate>;
