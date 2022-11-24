import { TAccount, UpdateAccount } from '../interfaces/Accounts';
import log from '../utils/logger';
import prisma from '../db/conn';
import { exclude } from '../utils/helpers';

export const updateAccount = async (accountData: TAccount) => {
  log('info', 'update-account', accountData);
  if (!accountData.userId || !accountData.provider) return;
  const updateData: UpdateAccount = exclude(accountData, 'userId', 'provider', 'providerAccountId');

  try {
    const updateAccount = await prisma.account.update({
      where: {
        userId_provider: {
          userId: accountData.userId,
          provider: accountData.provider
        }
      },
      data: { ...updateData }
    });
    return updateAccount;
  } catch (error) {
    if (error instanceof Error) {
      log('error', error.message);
    }
    log('error', 'Something went wrong updating account', error);
  }
};
export const getUsersTwitchAccount = async (userId: string) => {
  if (!userId) return;

  const twitchAccount = await prisma.account.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'twitch'
      }
    }
  });

  return twitchAccount;
};
