import got from 'got'
import fs from 'fs'
import FormData from 'form-data'

import { fileioUpload, makeVideoVertical } from '../service/cropService.js'

const currentJobStatus = {}

export const createCropVideo = async (req, res) => {
  if (!req.headers.authorization) return res.status(400).send()
  console.log(process.env)
  const { APP_KEY } = process.env
  if (!APP_KEY) return res.status(500).send('internal server error')
  const ACTION_KEY = req.headers.authorization.split(' ')[1]
  if (ACTION_KEY !== APP_KEY) return res.status(400).send()

  const { clip, cropData } = req.body
  if (!clip || !cropData) return res.status(400).send('please provide both clip and crop data')

  const { download_url: downloadUrl, id } = clip
  let fileStream = got.stream(downloadUrl)
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${id}.mp4`

  currentJobStatus[fileName] = { status: 'processing' }
  res.status(200).send({ id: fileName, ...currentJobStatus[fileName] })

  //wait for filestream to end
  console.log('streaming')
  await new Promise((resolve, reject) => {
    let file = fs.createWriteStream('./' + fileName)
    fileStream.pipe(file)
    file.on('finish', () => {
      resolve()
    })
  })

  const editVideo = await makeVideoVertical(clip, cropData, fileName)

  console.log('video edited')

  //fileIo
  let form = new FormData()
  form.append('file', fs.createReadStream(`./${editVideo}`))
  let fileIOResponse = await fileioUpload(form)

  console.log('fileio done')

  currentJobStatus[fileName] = {
    fileURL: fileIOResponse.data.link,
    key: fileIOResponse.data.key,
    status: 'done',
  }

  console.log('----JOB STATUS----')
  console.log(currentJobStatus[fileName])

  // delete local files
  fs.unlinkSync(`./${editVideo}`)
  fs.unlinkSync('./' + fileName)
  console.log('files deleted: ', editVideo, fileName)

  console.log(currentJobStatus)
}

export const videoStatus = async (req, res) => {
  const jobId = req.query.id
  res.status(200).send(currentJobStatus[jobId])
}
