import MongoDB from '../db/conn.js';
const Account = MongoDB.Collection('Account');

export const updateAccount = async (accountData) => {
  if (!accountData.userId || !accountData.provider) return;

  const updatedAccount = await Account.findOneAndUpdate(
    { userId: accountData.userId, provider: accountData.provider },
    { $set: { ...accountData } },
    { returnDocument: 'after' }
  );

  return updatedAccount;
};
