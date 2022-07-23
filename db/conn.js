import { MongoClient } from 'mongodb';

const connectToMongoDB = async (uri = '', options = {}) => {
  if (!process.mongodb) {
    const mongodb = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ...options,
    });

    const db = mongodb.db();
    process.mongodb = db;

    return {
      db,
      Collection: db.collection.bind(db),
      connection: mongodb,
    };
  }

  return null;
};

export default await connectToMongoDB(process.env.MONGO_URI, {});
