import prisma from '../db/conn';
import { CropTemplate } from '../interfaces/CropTemplate';
import log from '../utils/logger';

export type TCropType = 'no-cam' | 'cam-top' | 'cam-freeform' | 'freeform';
export const getCropTemplateByType = async (userId: string, cropType: TCropType) => {
  try {
    return (await prisma.cropTemplate.findFirst({
      where: { userId, cropType, name: 'default' }
    })) as CropTemplate;
  } catch (error) {
    log('error', 'getCropTemplateByType Error', error);
    return {} as CropTemplate;
  }
};
