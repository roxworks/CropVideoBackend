/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from 'zod';

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

export const TAccountOutput = TAccount.extend({
  access_token: z.string().nullable(),
  expires_at: z.number().nullable(),
  refresh_token: z.string().nullable(),
  refresh_expires_at: z.number().nullable(),
  obtainment_timestamp: z.number().nullable(),
  token_type: z.string().nullable(),
  scope: z.string().nullable(),
  id_token: z.string().nullable(),
  session_state: z.string().nullable(),
  oauth_token_secret: z.string().nullable(),
  oauth_token: z.string().nullable(),
  pageName: z.string().nullable(),
  pageId: z.string().nullable(),
  pageAccessToken: z.string().nullable()
});
export const TAccountWithId = TAccount.extend({ id: z.string() });

export type TAccount = z.TypeOf<typeof TAccount>;
export type TAccountOutput = z.TypeOf<typeof TAccountOutput>;
export type UpdateAccount = Omit<TAccount, 'id' | 'userId' | 'provider' | 'providerAccountId'>;
export type AccountWithId = z.TypeOf<typeof TAccountWithId>;
