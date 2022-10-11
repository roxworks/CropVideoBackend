import { TAccount } from '../interfaces/Accounts';
import clientPromise from '../db/conn';
import log from '../utils/logger';

export const updateAccount = async (accountData: TAccount) => {
  log('info', 'update-account', accountData);
  if (!accountData.userId || !accountData.provider) return;
  const client = await clientPromise;
  const db = client.db().collection<TAccount>('Account');

  const updatedAccount = await db.findOneAndUpdate(
    { userId: accountData.userId, provider: accountData.provider },
    { $set: { ...accountData } },
    { returnDocument: 'after' }
  );

  log('info', 'updated-account', updatedAccount);

  return updatedAccount;
};
export const getUsersTwitchAccount = async (userId: string) => {
  if (!userId) return;
  const client = await clientPromise;
  const db = client.db().collection<TAccount>('Account');

  const twitchAccount = await db.findOne({ userId, provider: 'twitch' });
  if (!twitchAccount) return;

  return twitchAccount;
};
