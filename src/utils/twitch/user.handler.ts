import { UserWithAccountsAndSettingsWithId } from '../../api/user/user.model';
import log from '../logger';
import apiClientConnect from './apiClient';

export const getUserFollowerCount = async (auth: UserWithAccountsAndSettingsWithId) => {
  if (!auth) return null;
  const broadcastId = auth.accounts.filter((acc) => acc.provider === 'twitch')[0].providerAccountId;
  if (!broadcastId) {
    log('warn', 'getUserFollowerCount - broadcastId not found', {
      userId: auth.id,
      username: auth.name,
    });
    return null;
  }
  console.log({ broadcastId });
  try {
    const api = await apiClientConnect(auth);
    if (api == undefined) {
      console.log('API is undefined, getting no new clips');
      return null;
    }
    const request = await api.users.getFollows({ followedUser: broadcastId, limit: 1 });
    if (!request) return null;

    return request.total as number;
  } catch (error) {
    console.log(error);
    throw Error('error');
  }
};
