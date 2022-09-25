import MongoDB from '../db/conn.js';
const User = MongoDB.Collection('User');

export const getAllUsers = async () => {
  const users = await User.find().toArray();

  return users;
};

export const getUserById = async (id) => {
  console.log('user by id');
  const user = await User.findOne({ _id: id });

  return user;
};
export const getUserByIdWithAccounts = async (id) => {
  const user = await User.aggregate([
    { $match: { _id: id } },
    { $addFields: { userId: { $toString: '$_id' } } },
    { $lookup: { from: 'Account', localField: 'userId', foreignField: 'userId', as: 'accounts' } },
  ]).toArray();

  return user[0];
};
