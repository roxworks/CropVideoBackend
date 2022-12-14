import prisma from '../db/conn';
import { CropTemplateOutput } from '../interfaces/CropTemplate';
import log from '../utils/logger';

export type TCropType = 'NO_CAM' | 'CAM_TOP' | 'CAM_FREEFORM' | 'FREEFORM';
export const getCropTemplateByType = async (userId: string, cropType: TCropType) => {
  try {
    return (await prisma.cropTemplate.findFirst({
      where: { userId, cropType, name: 'default' },
    })) as CropTemplateOutput;
  } catch (error) {
    log('error', 'getCropTemplateByType Error', error);
    return {} as CropTemplateOutput;
  }
};
