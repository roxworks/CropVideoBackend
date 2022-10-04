import { RefreshingAuthProvider } from '@twurple/auth';
import { ClientCredentialsAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { UserWithAccountsWithId } from '../../api/user/user.model';
import { getUsersTwitchAccount, updateAccount } from '../../service/Account';

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error(
    'Please define TWITCH_CLIENT_ID AND TWITCH_CLIENT_SECRET vairables inside .env.local'
  );
}
//@ts-ignore
let api = global.api;

if (!api) {
  //@ts-ignore
  api = global.api = { conn: null, promise: null };
}
async function tokenData(userId: string) {
  const account = await getUsersTwitchAccount(userId);

  return {
    accessToken: account?.access_token || undefined,
    refreshToken: account?.refresh_token || null,
    scope: account?.scope?.split(' ') || [],
    expiresIn: account?.expires_at || 0,
    obtainmentTimestamp: account?.obtainment_timestamp || 0
  };
}

async function authProvider(user?: UserWithAccountsWithId) {
  console.log('----------TWITCH-------');
  console.log('clientId', clientId);
  console.log('clientSecret', clientSecret);

  if (user) {
    return new RefreshingAuthProvider(
      {
        clientId: clientId!,
        clientSecret: clientSecret!,
        onRefresh: async (newTokenData) => {
          await updateAccount({
            type: 'bearer',
            userId: user._id.toString(),
            provider: 'twitch',
            access_token: newTokenData.accessToken,
            refresh_token: newTokenData.refreshToken!,
            scope: newTokenData.scope.join(' '),
            expires_at: newTokenData.expiresIn!,
            obtainment_timestamp: newTokenData.obtainmentTimestamp
          });
        }
      },
      await tokenData(user._id.toString())
    );
  } else {
    console.log('----------TWITCH-------');
    console.log('clientId', clientId);
    console.log('clientSecret', clientSecret);
    return new ClientCredentialsAuthProvider(clientId!, clientSecret!);
  }
}

export async function apiClientConnect(user?: UserWithAccountsWithId) {
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

module.exports = { apiClientConnect };
