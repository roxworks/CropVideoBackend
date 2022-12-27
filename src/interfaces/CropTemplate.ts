/* eslint-disable no-redeclare */
import { z } from 'zod';
import { cropSettingsSchemaOutput, cropTypeEnum } from '../api/crop/crop.model';

export const CropTemplate = z.object({
  name: z.string(),
  settingId: z.string(),
  userId: z.string(),
  cropType: cropTypeEnum,
  camCrop: cropSettingsSchemaOutput.nullable(),
  screenCrop: cropSettingsSchemaOutput,
});

export const CropTemplateOutput = CropTemplate.extend({
  screenCrop: cropSettingsSchemaOutput.nullable(),
});

export type CropTemplate = z.TypeOf<typeof CropTemplate>;
export type CropTemplateOutput = z.TypeOf<typeof CropTemplateOutput>;
