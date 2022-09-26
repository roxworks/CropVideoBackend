import { MongoClient } from 'mongodb';

const connectToMongoDB = async (uri = '', options = {}) => {
  if (!global.mongodb) {
    const mongodb = await MongoClient.connect(uri);

    const db = await mongodb.db();
    global.mongodb = db;

    return {
      db,
      Collection: db.collection.bind(db),
      connection: mongodb,
    };
  }
};

export default await connectToMongoDB(process.env.MONGO_URI, {});
