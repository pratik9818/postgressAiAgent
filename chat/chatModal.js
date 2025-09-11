import database from "../database/db.js";

class ChatModal {
    getCollection(collectionName) {
        return database.getDatabase().collection(collectionName);
    }
    async getChats(conversationId, userId){
       try {
        const collection = this.getCollection('chatHistory')
        const res = await collection.find({ conversationId: conversationId, userId: userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray();
        return res;
       } catch (error) {
        throw new Error(error);
       }
    }
}
export default ChatModal;