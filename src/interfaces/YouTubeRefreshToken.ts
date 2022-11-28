import { z } from 'zod';

export const YTRefreshToken = z.object({
  access_token: z.string(),
  expiry_date: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type YTRefreshToken = z.TypeOf<typeof YTRefreshToken>;
