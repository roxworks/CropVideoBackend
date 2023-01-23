/* eslint-disable no-redeclare */
import { z } from 'zod';
import { SettingsOutput } from '../../interfaces/Settings';
import { TAccount, TAccountOutput } from '../../interfaces/Accounts';

export const DefaultClips = z.enum(['pending', 'inqueue', 'complete', 'failed']);

export const TUser = z.object({
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
  defaultClips: DefaultClips.nullable(),
  followerCount: z.number().default(0),
});

export const UserWithAccounts = TUser.extend({
  accounts: z.array(TAccount),
});
export const UserWithAccountsAndSettings = TUser.extend({
  accounts: z.array(TAccountOutput),
  settings: SettingsOutput.nullable(),
});

export const UserWithAccountsAndSettingsWithId = UserWithAccountsAndSettings.extend({
  id: z.string(),
});

export const NewUserQueueReq = z.object({
  userId: z.string(),
  broadcasterId: z.string(),
});

export type TUser = z.TypeOf<typeof TUser>;
export type UserWithAccounts = z.TypeOf<typeof UserWithAccounts>;
export type UserWithAccountsAndSettings = z.TypeOf<typeof UserWithAccountsAndSettings>;
export type UserWithAccountsAndSettingsWithId = z.TypeOf<typeof UserWithAccountsAndSettingsWithId>;
export type DefaultClips = z.TypeOf<typeof DefaultClips>;
export type NewUserQueueReq = z.TypeOf<typeof NewUserQueueReq>;
