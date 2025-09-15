import database from "../database/db.js";
import {appLogger,workerLogger} from "../logger/pino.js";
class ChatModal {
  constructor() {}
  async getCollection(collectionName) {
    return database.getDatabase().collection(collectionName);
  }
  async saveUserQuery(query, userid, conversationId) {
    try {
      const collection = await this.getCollection("chatHistory");
      const dbres = await collection.insertOne({
        userId: userid,
        role: "user",
        createdAt: new Date(),
        content: query,
        conversationId: conversationId,
      });
      return dbres;
    } catch (error) {
      appLogger.error(error, "error in saving user query in mongodb");
      throw error;
    }
  }

  async getChatSummary(conversationId, userId) {
    try {
      const collection = await this.getCollection("conversation");
      const res = await collection.findOne(
        { conversationId: conversationId, userId: userId }
        // {
        //     projection:{
        //         summary:1,

        //     }
        // }
      );
      return res;
    } catch (error) {
      workerLogger.error(error, "error in getting chat summary in mongodb");
      throw error;
    }
  }

  async getChats(conversationId, userId, limit) {
    try {
      const collection = await this.getCollection("chatHistory");
      const res = await collection
        .find({ conversationId: conversationId, userId: userId  })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      return res;
    } catch (error) {
      workerLogger.error(error, "error in getting chats in mongodb");
      throw error;
    }
  }

  async saveLlmChat(conversationId, userId, role, content,dbData) {
    try {
      const collection = await this.getCollection("chatHistory");
      const dbres = await collection.insertOne({
        conversationId: conversationId,
        userId: userId,
        role: role,
        content: content,
        createdAt: new Date(),
        dbData: dbData
      });
      return dbres;
    } catch (error) {
      workerLogger.error(error, "error in saving llm chat in mongodb");
      throw error;
    }
  }
}
export default ChatModal;
