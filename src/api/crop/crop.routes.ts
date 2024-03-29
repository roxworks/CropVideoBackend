import { Router } from 'express';
import { validateRequest } from '../../middlewares';
import { getClipsReadyToUploaded } from '../../service/Clip';
import * as CropHandlers from './crop.handler';
import { JobId, RenderClipReq } from './crop.model';

const router = Router();

router.get('/', async (req, res) => {
  await getClipsReadyToUploaded();
  res.status(200).json({ message: 'crop' });
});

router.post('/', validateRequest({ body: RenderClipReq }), CropHandlers.createCropVideo);
router.get('/status', validateRequest({ query: JobId }), CropHandlers.videoStatus);

export default router;
