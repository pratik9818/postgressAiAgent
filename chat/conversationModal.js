import database from "../database/db.js";
import { ObjectId } from 'mongodb';
class ConversationModal {
  constructor() {}
  getCollection(collectionName) {
    return database.getDatabase().collection(collectionName);
  }
  async createConversation(userId) {
    try {
        const collection = this.getCollection('conversation')
        const res = await collection.insertOne({
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            conversationName : 'untitle'
        })
        return res;
    } catch (error) {
      throw new Error(error);
    }
  }

  async getConversation(userId){
    try {
        const collection = this.getCollection('conversation')
        const res = await collection.find({userId: userId})
        .sort({ updatedAt: -1 })
        .limit(10)
        .toArray();

        return res;
    } catch (error) {
        throw new Error(error);
    }
  }
    async updateConversationName(conversationId, conversationName ,userId){
    try {
      const collection = this.getCollection('conversation')
      const res = await collection.updateOne({ userId: userId,_id: new ObjectId(conversationId)}, {$set: {conversationName: conversationName , updatedAt: new Date()}});
      return res;
    } catch (error) {
      throw new Error(error);
    }
  }

  async deleteConversation(conversationId, userId){
    try {
      const collection = this.getCollection('conversation')
      const res = await collection.deleteOne({ userId: userId,_id: new ObjectId(conversationId)});
      return res;
    } catch (error) {
      throw new Error(error);
    }
  }
}
export default ConversationModal;