import { RefreshingAuthProvider, ClientCredentialsAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { UserWithAccountsAndSettingsWithId } from '../../api/user/user.model';
import { getUsersTwitchAccount, updateAccount } from '../../service/Account';

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error(
    'Please define TWITCH_CLIENT_ID AND TWITCH_CLIENT_SECRET vairables inside .env.local'
  );
}
// @ts-ignore
let { api } = global;

if (!api) {
  api = { conn: null, promise: null };
  // @ts-ignore
  global.api = { conn: null, promise: null };
}
async function tokenData(userId: string) {
  const account = await getUsersTwitchAccount(userId);
  return {
    accessToken: account?.access_token || undefined,
    refreshToken: account?.refresh_token || null,
    scope: account?.scope?.split(' ') || [],
    expiresIn: account?.expires_at || 0,
    obtainmentTimestamp: account?.obtainment_timestamp || 0,
  };
}

async function authProvider(user: UserWithAccountsAndSettingsWithId) {
  if (user) {
    return new RefreshingAuthProvider(
      {
        clientId: clientId!,
        clientSecret: clientSecret!,
        onRefresh: async (newTokenData) => {
          await updateAccount({
            type: 'bearer',
            userId: user.id,
            provider: 'twitch',
            access_token: newTokenData.accessToken,
            refresh_token: newTokenData.refreshToken!,
            scope: newTokenData.scope.join(' '),
            expires_at:
              newTokenData.expiresIn?.toString.length === 13
                ? parseInt(String(newTokenData.expiresIn! / 1000))
                : newTokenData.expiresIn!,
            obtainment_timestamp: parseInt(String(newTokenData.obtainmentTimestamp / 1000)),
          });
        },
      },
      await tokenData(user.id)
    );
  }
  return new ClientCredentialsAuthProvider(clientId!, clientSecret!);
}

export default async function apiClientConnect(user: UserWithAccountsAndSettingsWithId) {
  const provider = await authProvider(user);
  if (api.conn) {
    return api.conn;
  }
  if (!api.promise) {
    api.promise = new ApiClient({ authProvider: provider });
  }
  api.conn = await api.promise;
  return api.conn;
}
