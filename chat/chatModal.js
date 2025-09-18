import database from "../database/db.js";
import { ObjectId } from "mongodb";
class ChatModal {
    getCollection(collectionName) {
        return database.getDatabase().collection(collectionName);
    }
    async getChats(conversationId, userId,skipValue){
       try {
        const collection = this.getCollection('chatHistory')
        const res = await collection.find(
            { conversationId: conversationId, userId: userId },
            {projection:{dbData:0}}
        )
        .sort({ createdAt: -1 })
        .skip(skipValue)
        .limit(30)
        .toArray();
        return res;
       } catch (error) {
        throw new Error(error);
       }
    }
    async getChatDbData(userId, chatId){
        try {
            const collection = this.getCollection('chatHistory')
            const res = await collection.findOne({ userId: userId, _id: new ObjectId(chatId) },{projection:{dbData:1}});
            return res;
        } catch (error) {
            console.log(error);
            
            throw new Error(error);
        }
    }
}
export default ChatModal;