import express from 'express'
import { createCropVideo, videoStatus } from '../controller/cropController.js'

const router = express.Router()

router.route('/').post(createCropVideo)
router.route('/status').get(videoStatus)

export default router
