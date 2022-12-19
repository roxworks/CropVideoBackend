//[] get all paid users
//[x]users accounts
//[x] users settings
//[x] users schedule days
//[x] users clips
//[x] users twitch clips
//[X] cropTemplates
//[x] check they have scheduleDays
//[x] approveStatus default

import 'dotenv/config';
import clientPromise from '../db/mongoDb';
import { ObjectId, WithId } from 'mongodb';
import { z } from 'zod';
import { exclude } from '../utils/helpers';
import prisma from '../db/conn';

export const DefaultClips = z.enum(['pending', 'inqueue', 'complete', 'failed']);
export const User = z.object({
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  customer_id: z.string().nullable(),
  sub_id: z.string().nullable(),
  sub_type: z.number().nullable(),
  sub_time_range: z.number().nullable(),
  sub_time_created: z.number().nullable(),
  sub_current_start: z.number().nullable(),
  sub_current_end: z.number().nullable(),
  sub_status: z.string().nullable(),
  defaultClips: DefaultClips,
});

export type TUser = z.TypeOf<typeof User>;
export type TUserWithId = WithId<TUser>;

export const cropTypeEnum = z.enum(['NO_CAM', 'CAM_TOP', 'CAM_FREEFORM', 'FREEFORM']);
type TCropEnum = z.TypeOf<typeof cropTypeEnum>;

export const Account = z.object({
  type: z.string(),
  userId: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
  session_state: z.string().optional(),
  oauth_token_secret: z.string().optional(),
  oauth_token: z.string().optional(),
  pageName: z.string().optional().nullable(),
  pageId: z.string().optional().nullable(),
  pageAccessToken: z.string().optional().nullable(),
  refresh_token: z.string().nullable(),
  access_token: z.string().nullable(),
  expires_at: z.number().nullable(),
  refresh_expires_at: z.number().nullable(),
  obtainment_timestamp: z.number().default(0),
  username: z.string().nullable(),
});

export const platformsSchema = z.enum(['TikTok', 'YouTube', 'Instagram', 'Facebook']);
export const YoutubePrivacy = z.enum(['Public', 'Unlisted', 'Private']);

export const cropSettingsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  scaleX: z.number().nullable(),
  scaleY: z.number().nullable(),
  isNormalized: z.boolean().default(true),
});

export const CropData = z.object({
  camCrop: cropSettingsSchema.optional(),
  screenCrop: cropSettingsSchema,
  cropType: cropTypeEnum,
  startTime: z.number().optional(),
  endTime: z.number().optional(),
});

export const ClipManual = z.object({
  broadcaster_name: z.string(),
  broadcaster_id: z.string(),
  created_at: z.string(),
  creator_name: z.string(),
  creator_id: z.string(),
  download_url: z.string(),
  embed_url: z.string(),
  game_id: z.string(),
  twitch_id: z.string(),
  language: z.string(),
  thumbnail_url: z.string(),
  title: z.string(),
  url: z.string(),
  video_id: z.string().default(''),
  view_count: z.number(),
});

export const Clip = z.object({
  userId: z.string(),
  broadcasterName: z.string(),
  broadcasterId: z.string(),
  creatorName: z.string(),
  creatorId: z.string(),
  embedUrl: z.string(),
  gameId: z.string(),
  language: z.string(),
  title: z.string(),
  url: z.string(),
  videoId: z.string(),
  twitch_id: z.string(),
  viewCount: z.number(),
  thumbnailUrl: z.string(),
  createdAt: z.date(),
  downloadUrl: z.string(),
  approved: z.boolean().default(false),
  status: z.string(),
  uploadPlatforms: z.array(platformsSchema),
  uploadTime: z.string().optional().nullable(),
  scheduledUploadTime: z.date().optional().nullable(),
  uploaded: z.boolean().default(false),
  youtubeUploaded: z.boolean().default(false).optional(),
  youtubeUploadTime: z.string().or(z.date()).optional().nullable(),
  youtubeStatus: z.string().optional().nullable(),
  tiktokUploaded: z.boolean().default(false).optional(),
  tiktokUploadTime: z.string().or(z.date()).optional().nullable(),
  tiktokStatus: z.string().optional().nullable(),
  instagramUploaded: z.boolean().default(false).optional(),
  instagramUploadTime: z.string().or(z.date()).optional().nullable(),
  instagramStatus: z.string().optional().nullable(),
  facebookUploaded: z.boolean().default(false).optional(),
  facebookUploadTime: z.string().or(z.date()).optional().nullable(),
  facebookStatus: z.string().optional().nullable(),
  youtubePrivacy: z.string(YoutubePrivacy).default('Private'),
  youtubeCategory: z.string().optional().nullable(),
  cropData: CropData,
  caption: z.string().optional().nullable(),
  youtubeTitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  renderedUrl: z.string().optional(),
  facebookDescription: z.string().optional().nullable(),
});

export const CurrentClip = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  privacy: z.string().optional(),
  youtubePrivacy: z.string().optional(),
  youtubeCategory: z.string().optional(),
  youtubeDescription: z.string().optional(),
  clipURL: z.string().optional(),
});

export const ClipWithId = Clip.extend({ id: z.string() });

export const categories = z.enum([
  'Film & Animation',
  'Autos & Vehicles',
  'Music',
  'Pets & Animals',
  'Sports',
  'Travel & Events',
  'Gaming',
  'People & Blogs',
  'Comedy',
  'Entertainment',
  'News & Politics',
  'Howto & Style',
  'Education',
  'Science & Technology',
  'Nonprofits & Activism',
]);

export const ClipManualWithUserId = ClipManual.extend({
  userId: z.string(),
  uploaded: z.boolean().optional(),
  uploadPlatforms: z.array(z.enum(['tiktok', 'youtube', 'instagram'])).optional(),
  approved: z.boolean().optional(),
  approvedStatus: z.enum(['AUTO_APPROVE', 'MANUAL_APPROVE', 'CANCELED']).optional(),
  scheduled: z.boolean().optional(),
  cropType: cropTypeEnum.optional(),
  youtubeHashtags: z.array(z.string()).optional(),
  youtubeDescription: z.string().optional().nullable(),
  youtubePrivacy: z.enum(['public', 'unlisted', 'private']).optional(),
  youtubeCategory: categories.optional(),
  youtubeTitle: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  instagramHashtags: z.array(z.string()).optional(),
  facebookDescription: z.string().optional().nullable(),
  startTime: z.number().optional().nullable(),
  endTime: z.number().optional().nullable(),
});

const scheduleDays = z
  .object({
    sun: z.array(z.string()),
    mon: z.array(z.string()),
    tue: z.array(z.string()),
    wed: z.array(z.string()),
    thu: z.array(z.string()),
    fri: z.array(z.string()),
    sat: z.array(z.string()),
  })
  .optional()
  .nullable();

export const Settings = z.object({
  userId: z.instanceof(ObjectId),
  delay: z.number().optional().default(24),
  minViewCount: z.number().optional().default(10),
  uploadFrequency: z.number().optional().default(12),
  license: z.string().nullable(),
  camCrop: cropSettingsSchema.optional(),
  screenCrop: cropSettingsSchema.optional(),
  cropType: cropTypeEnum.optional().nullable(),
  verticalVideoEnabled: z.boolean().optional().default(true),
  uploadEnabled: z.boolean().optional().default(false),
  defaultApprove: z.boolean().optional().default(false),
  onbaordingComplete: z.boolean().optional().default(false),
  mainTutorialComplete: z.boolean().optional().default(false),
  clipsTutorialComplete: z.boolean().optional().default(false),
  youtubeHashtags: z.string().optional(),
  youtubeTags: z.string().optional().nullable(),
  youtubePrivacy: z.string().optional().default('private'),
  youtubeAutoCategorization: z.boolean().optional().default(true),
  youtubeCategory: z.string().optional(),
  youtubeDescription: z.string().optional().nullable(),
  instagramCaption: z.string().optional().nullable(),
  lastUploaded: z.date().optional().nullable(),
  lastUploadedId: z.string().optional().nullable(),
  lastUploadTiktok: z.date().optional().nullable(),
  lastUploadYoutube: z.date().optional().nullable(),
  lastUploadInstagram: z.date().optional().nullable(),
  lastUploadedClipYouTube: z.string().optional().nullable(),
  lastUploadedClipTiktok: z.string().optional().nullable(),
  lastUploadedClipInstagram: z.string().optional().nullable(),
  uploadCount: z.number().optional().default(0),
  selectedPlatforms: z.array(z.enum(['youtube', 'tiktok', 'instagram'])).optional(),
  youtubeCount: z.number().optional().default(0),
  tiktokCount: z.number().optional().default(0),
  instagramCount: z.number().optional().default(0),
  approveDate: z.date().optional(),
  timeOffset: z.number().optional(),
  scheduleDays: scheduleDays,
});

export const CropTemplate = z.object({
  name: z.string(),
  settingId: z.string(),
  userId: z.string(),
  cropType: cropTypeEnum,
  camCrop: cropSettingsSchema,
  screenCrop: cropSettingsSchema,
});

export type TCropTemplate = z.TypeOf<typeof CropTemplate>;
export type TCropTemplateWithId = WithId<TCropTemplate>;

type TScheduleDays = z.TypeOf<typeof scheduleDays>;
export type TAccount = z.TypeOf<typeof Account>;
export type AccountWithId = WithId<TAccount>;
export type TSettings = z.TypeOf<typeof Settings>;
export type TSettingsWithId = WithId<TSettings>;
export type TClip = z.infer<typeof Clip>;
export type TCurrentClip = z.infer<typeof CurrentClip>;
export type TClipManual = z.infer<typeof ClipManual>;
export type TClipWithId = z.infer<typeof ClipWithId>;
export type TClipWithIdMongo = WithId<TClip>;
export type TScheduledClipsArray = z.infer<typeof ScheduledClipsArray>;
export type TCropData = z.infer<typeof CropData>;
export type TClipManualWithUserId = WithId<z.infer<typeof ClipManualWithUserId>>;
export type TplatformsSchema = z.infer<typeof platformsSchema>;
export const ScheduledClipsArray = z.object({
  scheduledClips: z.array(ClipWithId),
});

type PaidUser = TUserWithId & {
  accounts: AccountWithId[];
  settings: (TSettingsWithId & { scheduleDays: TScheduleDays })[];
  clips: TClipWithIdMongo[];
  twitchClips: TClipManualWithUserId[];
  cropTemplates: TCropTemplateWithId[];
  userId: string;
};

export const getPaidUsersFromMongo = async () => {
  const client = await clientPromise;
  const db = client.db().collection<TUserWithId[]>('User');

  const user = await db
    .aggregate([
      { $match: { sub_id: { $exists: true } } },
      { $addFields: { userId: { $toString: '$_id' } } },
      {
        $lookup: {
          from: 'Account',
          localField: 'userId',
          foreignField: 'userId',
          as: 'accounts',
        },
      },
      {
        $lookup: {
          from: 'Setting',
          localField: '_id',
          foreignField: 'userId',
          as: 'settings',
        },
      },
      {
        $lookup: {
          from: 'Clip',
          localField: '_id',
          foreignField: 'userId',
          as: 'clips',
        },
      },
      {
        $lookup: {
          from: 'TwitchClip',
          localField: 'userId',
          foreignField: 'userId',
          as: 'twitchClips',
        },
      },
      {
        $lookup: {
          from: 'CropTemplate',
          localField: 'userId',
          foreignField: 'userId',
          as: 'cropTemplates',
        },
      },
    ])
    .toArray();
  return user as PaidUser[];
};

type oldCropTypes = 'cam-top' | 'no-cam' | 'cam-freeform' | 'freeform';
const convertCropType = (type: oldCropTypes) => {
  const map: Record<oldCropTypes, TCropEnum> = {
    'cam-top': 'CAM_TOP',
    'no-cam': 'NO_CAM',
    'cam-freeform': 'CAM_FREEFORM',
    freeform: 'FREEFORM',
  };
  return map[type];
};
async function main() {
  const users = await getPaidUsersFromMongo();
  for (const user of users) {
    const accounts = user.accounts;
    const settings = user.settings;
    const uploadedClips = user.clips;
    const twitchClips = user.twitchClips;
    const scheduleDays = user.settings[0].scheduleDays;
    const cropTemplates = user.cropTemplates;
    // create user
    const userData: TUser = exclude(
      user,
      '_id',
      'accounts',
      'settings',
      'clips',
      'twitchClips',
      'cropTemplates',
      'userId'
    );
    const settingData: Omit<TSettings, '_id' | 'userId' | 'scheduleDays' | 'onbaordingComplete'> =
      exclude(settings[0], '_id', 'userId', 'scheduleDays', 'onbaordingComplete');
    const accountData: Omit<AccountWithId, '_id' | 'userId'>[] = accounts.map((account) =>
      exclude(account, '_id', 'userId')
    );
    const cropTemplatesData: Omit<TCropTemplateWithId, '_id' | 'userId' | 'settingId'>[] =
      cropTemplates.map((template) => exclude(template, '_id', 'userId', 'settingId'));

    await prisma.$transaction(async (tx) => {
      // 1. Create new user and settings
      const newUser = await tx.user.upsert({
        include: { settings: true },
        where: { email: userData.email },
        update: {},
        create: {
          ...userData,
          settings: {
            create: {
              ...settingData,
              cropType: settingData.cropType
                ? convertCropType(settingData.cropType as oldCropTypes)
                : null,
            },
          },
        },
      });

      // 2. Verify user created
      if (!newUser) {
        throw new Error('Failed to create user and settings');
      }

      if (scheduleDays && newUser?.settings?.id) {
        await tx.scheduledDays.upsert({
          where: { userId: newUser.id },
          update: { ...scheduleDays },
          create: {
            ...scheduleDays,
            user: { connect: { id: newUser.id } },
            setting: { connect: { id: newUser.settings.id } },
          },
        });
      }
      if (cropTemplatesData?.length > 0 && newUser?.settings?.id) {
        for (const template of cropTemplatesData) {
          await tx.cropTemplate.upsert({
            where: {
              name_cropType_settingId: {
                name: template.name,
                cropType: convertCropType(template.cropType as oldCropTypes),
                settingId: newUser.settings.id,
              },
            },
            update: { ...template, cropType: convertCropType(template.cropType as oldCropTypes) },
            create: {
              ...template,
              cropType: convertCropType(template.cropType as oldCropTypes),
              user: { connect: { id: newUser.id } },
              setting: { connect: { id: newUser.settings.id } },
            },
          });
        }
      }

      for (const account of accountData) {
        if (account.provider === 'youtube' && account.expires_at) {
          const expiresTimeToSeconds = parseInt(String(account.expires_at / 1000));
          account.expires_at = expiresTimeToSeconds;
        }
        account.obtainment_timestamp =
          account.obtainment_timestamp && account.obtainment_timestamp > 0
            ? parseInt(String(account.obtainment_timestamp / 1000))
            : 0;
        await tx.account.upsert({
          where: { userId_provider: { userId: newUser.id, provider: account.provider } },
          update: {},
          create: { ...account, userId: newUser.id },
        });
      }

      const twitchClipsData: Omit<TClipManualWithUserId, '_id'>[] = twitchClips.map((clip) => {
        const data = exclude(clip, '_id', 'userId');
        const cropType = data.cropType ? convertCropType(data.cropType as oldCropTypes) : undefined;
        return { ...data, userId: newUser.id, cropType };
      });

      if (twitchClipsData?.length > 0) {
        await tx.twitchClip.createMany({
          data: twitchClipsData,
          skipDuplicates: true,
        });
      }

      const uploadedClipsData: Omit<TClipWithIdMongo, '_id'>[] = uploadedClips.map((clip) => {
        const data = exclude(clip, '_id', 'userId');
        return {
          ...data,
          userId: newUser.id,
          twitch_id: data.videoId,
          cropData: {
            ...data.cropData,
            cropType: convertCropType(data.cropData.cropType as oldCropTypes),
          },
        };
      });

      if (uploadedClipsData?.length > 0) {
        await tx.clip.createMany({ data: uploadedClipsData, skipDuplicates: true });
      }
      console.log(`${newUser.name} done`);
      return newUser;
    });
  }
  return;
}
main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
