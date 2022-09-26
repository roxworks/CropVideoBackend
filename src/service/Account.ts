import MongoDB from '../db/conn';
import { TAccount } from '../interfaces/Accounts';
const Account = MongoDB?.Collection<TAccount>('Account');

export const updateAccount = async (accountData: TAccount) => {
  if (!accountData.userId || !accountData.provider) return;

  const updatedAccount = await Account?.findOneAndUpdate(
    { userId: accountData.userId, provider: accountData.provider },
    { $set: { ...accountData } },
    { returnDocument: 'after' }
  );

  return updatedAccount;
};
