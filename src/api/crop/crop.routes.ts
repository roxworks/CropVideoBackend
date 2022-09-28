import { Router } from 'express';
import { validateRequest } from '../../middlewares';
import { getClipsReadyToUploaded } from '../../service/Clip';
import * as CropHandlers from './crop.handler';
import { RenderClipReq } from './crop.model';
import { JobId } from './crop.model';

const router = Router();

router.get('/', async (req, res) => {
  const clip = await getClipsReadyToUploaded();
  console.log(clip);
  res.status(200).json({ message: 'crop' });
});

router.post('/', validateRequest({ body: RenderClipReq }), CropHandlers.createCropVideo);
router.get('/status', validateRequest({ query: JobId }), CropHandlers.videoStatus);

export default router;