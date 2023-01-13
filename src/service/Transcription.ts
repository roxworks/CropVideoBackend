import axios from 'axios';
import prisma from '../db/conn';
import { TypeTranscriptionInput, TypeTranscriptionResponse } from '../interfaces/Transcription';
import { sleep } from '../utils/helpers';
import fs from 'fs';

export const getTranscriptionByTwitchIdFromDB = async (twitchId: string) => {
  if (!twitchId) return;

  return await prisma.transcription.findFirst({ where: { twitchId } });
};

export const convertTranscriptToSrtFile = async (
  srtJson: TypeTranscriptionInput,
  fileName: string
) => {
  const split = srtJson.subtitles.split('\n').join('\n');

  await fs.promises.writeFile(fileName, split, 'utf8');
  return fileName;
};

export const createSrtRequest = async (downloadUrl: string) => {
  const response = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: '7f686e243a96c7f6f0f481bcef24d688a1369ed3983cea348d1f43b879615766',
      input: {
        audio_path: downloadUrl,
        format: 'srt',
      },
    },
    {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status !== 201) {
    const error = response.data;
    console.log(error.detail);
    //TODO handle error
  }

  const transcribe: TypeTranscriptionResponse = response.data;
  console.log('srt created');

  return transcribe;
};

export const checkTranscribeStatus = async (jobId: string) => {
  const response = await axios.get(`https://api.replicate.com/v1/predictions/${jobId}`, {
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status !== 200) {
    const error = response.data;
    console.log(error.detail);
  }

  const transcribe: TypeTranscriptionResponse = response.data;
  return transcribe;
};

export const cancelTranscribeJob = async (jobId: string) => {
  const response = await axios.post(
    `https://api.replicate.com/v1/predictions/${jobId}/cancel`,
    { version: '7f686e243a96c7f6f0f481bcef24d688a1369ed3983cea348d1f43b879615766' },
    {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response;
};

export const saveTranscription = async (
  srtJson: TypeTranscriptionResponse,
  twitchId: string,
  userId?: string
) => {
  //todo handle missing data

  const convertJson = convertTranscriptionRequestToDBInput(srtJson, twitchId);
  if (!convertJson) return;

  const transcript = await prisma.transcription.create({ data: convertJson });
  if (srtJson.status === 'succeeded' && userId) {
    await prisma.twitchClip.updateMany({
      where: { twitch_id: twitchId, userId: userId },
      data: { transcribeComplete: true },
    });
  }

  return transcript;
};

const convertTranscriptionRequestToDBInput = (
  srtJson: TypeTranscriptionResponse,
  twitchId: string
): TypeTranscriptionInput | undefined => {
  if (!srtJson.output || !srtJson.completed_at || !srtJson.created_at || !srtJson.started_at)
    return;
  return {
    completedAt: srtJson.completed_at,
    createdAt: srtJson.created_at,
    startedAt: srtJson.started_at,
    status: srtJson.status,
    jobId: srtJson.id,
    format: srtJson.input.format,
    audioPath: srtJson.input.audio_path,
    textOutput: srtJson.output?.text,
    subtitles: srtJson.output?.subtitles,
    language: srtJson.output?.language,
    version: srtJson.version,
    twitchId: twitchId,
  };
};

export const getOrCreateSrtJson = async (downloadUrl: string, twitchId: string, userId: string) => {
  const srtInDB = await getTranscriptionByTwitchIdFromDB(twitchId);
  if (srtInDB) {
    return srtInDB;
  }

  console.log('---getting srt from api----');

  const srtRequest = await createSrtRequest(downloadUrl);
  if (!srtRequest) return;

  let transcribe = srtRequest;

  while (transcribe?.status !== 'succeeded' && transcribe?.status !== 'failed') {
    console.log({ transcribe });
    await sleep(1500);
    const response = await checkTranscribeStatus(transcribe.id);
    transcribe = response;
  }
  if (
    !transcribe.output ||
    !transcribe.completed_at ||
    !transcribe.created_at ||
    !transcribe.started_at
  )
    return;

  if (transcribe.status === 'succeeded') {
    await saveTranscription(transcribe, twitchId, userId);
  }
  const convertJson = convertTranscriptionRequestToDBInput(transcribe, twitchId);
  if (!convertJson) return;
  return convertJson;
};
