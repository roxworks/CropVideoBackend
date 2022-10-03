import clientPromise from "../db/conn";
import {
  UserWithAccounts,
  UserWithAccountsWithId,
  UserWithId,
} from "../api/user/user.model.js";
import { ObjectId } from "mongodb";

export const getAllUsers = async () => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId>("User");

  const users = await db.find().toArray();

  return users;
};

export const getUserById = async (id: string) => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId>("User");

  const user = await db.findOne({ _id: new ObjectId(id) });

  return user;
};
export const getUserByIdWithAccounts = async (id: string) => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId[]>("User");

  const user = await db
    .aggregate([
      { $match: { _id: new ObjectId(id) } },
      { $addFields: { userId: { $toString: "$_id" } } },
      {
        $lookup: {
          from: "Account",
          localField: "userId",
          foreignField: "userId",
          as: "accounts",
        },
      },
    ])
    .toArray();
  console.log("DBUSER:", user);
  return user?.[0] as UserWithAccounts;
};

type UserAccountWithUserId = UserWithAccountsWithId & { userId: string };
export const getUsersWithoutClips = async () => {
  const client = await clientPromise;
  const db = client.db().collection<UserWithId>("User");

  const users = (await db
    .aggregate([
      { $match: { defaultClips: { $in: [null, false] } } },
      { $addFields: { userId: { $toString: "$_id" } } },
      {
        $lookup: {
          from: "Account",
          localField: "userId",
          foreignField: "userId",
          as: "accounts",
        },
      },
    ])
    .toArray()) as UserAccountWithUserId[];

  return users;
};
