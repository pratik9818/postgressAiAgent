import database  from '../database/db.js';
class ChatModal {
    constructor() {};
    async getCollection(collectionName){
        return database.getDatabase().collection(collectionName);
    }
    async saveUserQuery(query,userid,conversationId) {
        try {
            const collection = await this.getCollection("chatHistory");
            const dbres = await collection.insertOne({
            userId:userid,
            role: 'user',
            createdAt: new Date(),
            content:query,
            conversationId:conversationId
            })
            return dbres;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async getChatSummary(conversationId,userId){
        const collection = await this.getCollection("conversation");
        const res  = await collection.findOne(
            {conversationId:conversationId,userId:userId}
            // {
            //     projection:{
            //         summary:1,
                    
            //     }
            // }
        );
        return res;
    }

    async getChats(conversationId,userId,limit){
        const collection = await this.getCollection("chatHistory");
        const res = await collection.find({conversationId:conversationId,userId:userId}).sort({createdAt:-1}).limit(limit).toArray();
        return res;
    }

    async saveLlmChat(conversationId,userId,role,content){
        const collection = await this.getCollection("chatHistory");
        const dbres = await collection.insertOne({
            conversationId:conversationId,
            userId:userId,
            role:role,
            content:content,
            createdAt:new Date()
        })
        return dbres;
    }
}
export default ChatModal;