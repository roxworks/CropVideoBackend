import { TypeOf, z } from 'zod';
import { WithId } from 'mongodb';
import { TAccount } from '../../interfaces/Accounts';
import { TSettings } from '../../interfaces/Settings';

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
  sub_status: z.string().nullable()
});

export const UserWithAccounts = TUser.extend({
  accounts: z.array(TAccount)
});
export const UserWithAccountsAndSettings = TUser.extend({
  accounts: z.array(TAccount),
  settings: z.array(TSettings)
});

export type TUser = z.TypeOf<typeof TUser>;
export type UserWithId = WithId<TUser>;
export type UserWithAccounts = z.TypeOf<typeof UserWithAccounts>;
export type UserWithAccountsWithId = WithId<UserWithAccounts>;
export type UserWithAccountsAndSettings = z.TypeOf<typeof UserWithAccountsAndSettings>;
export type UserWithAccountsAndSettingsWithId = WithId<UserWithAccountsAndSettings>;
