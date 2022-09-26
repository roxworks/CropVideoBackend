import MongoDB from '../db/conn';
import { UserWithId } from '../api/user/user.model.js';
const User = MongoDB!.Collection<UserWithId>('User');
import { ObjectId } from 'mongodb';

export const getAllUsers = async () => {
  const users = await User.find().toArray();

  return users;
};

export const getUserById = async (id: string) => {
  console.log('user by id');
  const user = await User.findOne({ _id: new ObjectId(id) });

  return user;
};
export const getUserByIdWithAccounts = async (id: string) => {
  const user = await User.aggregate([
    { $match: { _id: id } },
    { $addFields: { userId: { $toString: '$_id' } } },
    { $lookup: { from: 'Account', localField: 'userId', foreignField: 'userId', as: 'accounts' } },
  ]).toArray();

  return user?.[0];
};
