import express from 'express'
import cors from 'cors'
import { path } from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'
ffmpeg.setFfmpegPath(path)
import { path as ffprobePath } from '@ffprobe-installer/ffprobe'
ffmpeg.setFfprobePath(ffprobePath)

import crop from './routes/crop.js'

import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.use('/', crop)

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`)
})
