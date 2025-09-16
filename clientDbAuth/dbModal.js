import database from "../database/db.js";
import { appLogger } from "../logger/pino.js";

class DbModel {
  async getCollection(collectionName) {
    return database.getDatabase().collection(collectionName);
  }

  async saveDBCredentials(dbCredentials, userId) {
    try {
      const collection = await this.getCollection("userDbCredentials");
      const res = await collection.findOne({ userId: userId });
      if (res) {
        const updatedRes = await collection.updateOne(
          { userId: userId },
          {
            $set: {
              dbCredentials,
              updatedAt: new Date(),
            },
          }
        );
        this.updateUser(userId);
        return updatedRes;
      } else {
        const newRes = await collection.insertOne({
          userId: userId,
          dbCredentials: dbCredentials,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        this.updateUser(userId);
        return newRes;
      }
    } catch (error) {
      appLogger.error(error);
      throw error;
    }
  }

  async updateUser(userId) {
    try {
      const collection = await this.getCollection("users");
      await collection.updateOne(
        { userId: userId },
        { $set: { dbPassword: true } }
      );
      return true;
    } catch (error) {
      appLogger.error(error);
      throw error;
    }
  }
  async getDBCredentials(userId) {
    try {
      const collection = await this.getCollection("userDbCredentials");
      const credentialsData = await collection.findOne({ userId: userId });
      return credentialsData;
    } catch (error) {
      appLogger.error(error);
      throw error;
    }
  }

  async deleteDBCredentials(userId) {
    try {
      const collection = await this.getCollection("userDbCredentials");
      const res = await collection.deleteOne({ userId: userId });
      return res;
    } catch (error) {
      appLogger.error(error);
      throw error;
    }
  }
}

export default DbModel;
