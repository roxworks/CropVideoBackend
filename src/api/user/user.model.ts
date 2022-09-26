import { z } from 'zod';
import { WithId } from 'mongodb';

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
});

export type TUser = z.TypeOf<typeof TUser>;
export type UserWithId = WithId<TUser>;
