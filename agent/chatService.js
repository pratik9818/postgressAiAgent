import ChatModal from "./chatModal.js";
import queryProcessingQueue from "./queue.js";
class ChatService {
    constructor() {
        this.chatModal = new ChatModal()
    }
    

    async processUserQuery(req , res, next){
        const {query,userid,conversationId} = req.body;
        // const userid = req.userid
        if(!query) return res.status(400).json({message: "Query is required"});
        if(!conversationId) return res.status(400).json({message: "Conversation id is required"});
        try {
            const dbres = await this.chatModal.saveUserQuery(query,userid,conversationId);
            console.log(dbres);
            this.sendUserQueryToQueue(query,userid,dbres.insertedId,conversationId);
            // AFTER THIS WE NEED TO SEND BACK RES TO THE CLIENT AND ANOTHER PROCESS GOES TO QUEUE;
            return res.status(200).json({message: "Fetching result from your db", data: dbres});

        } catch (error) {
            console.log(error);
            return res.status(500).json({message: "Internal server error - in chat service" });
            
        }
    }

    async sendUserQueryToQueue(query,userid,chatid,conversationId){
      const res =   await queryProcessingQueue.add('getUserDbInsight', {query,userid,chatid,conversationId});
        console.log(res);
        // return d;
    }
}

export default ChatService;