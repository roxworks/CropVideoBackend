import clientPromise from '../db/conn';
import { CropTemplateWithId } from '../interfaces/CropTemplate';

export type TCropType = 'no-cam' | 'cam-top' | 'cam-freeform' | 'freeform';
export const getCropTemplateByType = async (userId: string, cropType: TCropType) => {
  const client = await clientPromise;
  const db = client.db().collection<CropTemplateWithId>('CropTemplate');

  const template = await db.find({ userId, cropType: cropType, name: 'default' }).toArray();

  return template[0];
};
