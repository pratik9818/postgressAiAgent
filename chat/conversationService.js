import { appLogger } from "../logger/pino.js";
import ConversationModal from "./conversationModal.js";

class ConversationService {
    constructor(){
        this.chatModal = new ConversationModal();
    }
    async createConversation(req , res){
        const userId = req.userId || '123123';
        try {
            const result = await this.chatModal.createConversation(userId);
            appLogger.info(result , 'conversation created successfully');
            res.status(201).json({
                message: 'Conversation created successfully',
                data: result
            })
        } catch (error) {
            appLogger.error(error , 'error in creating conversation');            
            res.status(500).json({
                message: 'something went wrong in creating conversation',
                error:error
            })
        }
    }

    async getConversation(req , res){
        const userId = req.userId ;
        
        const skipvalue = req.query.skipvalue || 0;
        try {
            const result = await this.chatModal.getConversation(userId,skipvalue);
            
            appLogger.info(result , 'conversation fetched successfully');
            res.status(200).json({
                message: 'Conversation fetched successfully',
                data: result
            })
        } catch (error) {
            appLogger.error(error , 'error in getting conversation');
            res.status(500).json({
                message: 'something went wrong in getting conversation',
                error:error
            })
            
        }
    }

    async updateConversationName(req,res){
        try {
            const { conversationId, conversationName } = req.body;
            const userId = req.userId;
            const result = await this.chatModal.updateConversationName(conversationId, conversationName, userId);
            appLogger.info(result , 'conversation name updated successfully');
            
            res.status(200).json({
                message: 'Conversation name updated successfully',
                data: result
            })
        } catch (error) {
            appLogger.error(error , 'error in updating conversation name');
            res.status(500).json({
                message: 'something went wrong in updating conversation name',
                error:error
            })
            
        }
    }

    async deleteConversation(req,res){
        try {
            const { conversationId } = req.body;
            const userId = req.userId || '123123';
            const result = await this.chatModal.deleteConversation(conversationId, userId);
            appLogger.info(result , 'conversation deleted successfully');
            res.status(200).json({
                message: 'Conversation deleted successfully',
                data: result
            })
        } catch (error) {
            appLogger.error(error , 'error in deleting conversation');
            res.status(500).json({
                message: 'something went wrong in deleting conversation',
                error:error
            })
        }
    }
}

export default ConversationService;