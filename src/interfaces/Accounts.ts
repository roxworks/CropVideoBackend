import { z } from 'zod';
import { WithId } from 'mongodb';

export const TAccount = z.object({
  type: z.string(),
  userId: z.string(),
  provider: z.string(),
  providerAccountId: z.string().optional(),
  refresh_token: z.string().optional(),
  access_token: z.string(),
  expires_at: z.number(),
  refresh_expires_at: z.number().optional(),
  obtainment_timestamp: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
  session_state: z.string().optional(),
  oauth_token_secret: z.string().optional(),
  oauth_token: z.string().optional(),
  pageName: z.string().optional().nullable(),
  pageId: z.string().optional().nullable(),
  pageAccessToken: z.string().optional().nullable()
});

export type TAccount = z.TypeOf<typeof TAccount>;
export type AccountWithId = WithId<TAccount>;
