import { TAccount } from '../interfaces/Accounts';
import clientPromise from '../db/conn';

export const updateAccount = async (accountData: TAccount) => {
  if (!accountData.userId || !accountData.provider) return;
  const client = await clientPromise;
  const db = client.db().collection<TAccount>('Account');

  const updatedAccount = await db.findOneAndUpdate(
    { userId: accountData.userId, provider: accountData.provider },
    { $set: { ...accountData } },
    { returnDocument: 'after' }
  );

  return updatedAccount;
};
