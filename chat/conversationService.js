import ConversationModal from "./conversationModal.js";

class ConversationService {
    constructor(){
        this.chatModal = new ConversationModal();
    }
    async createConversation(req , res){
        const userId = req.userId || '123123';
        try {
            const result = await this.chatModal.createConversation(userId);
            console.log(result);
            res.status(201).json({
                message: 'Conversation created successfully',
                data: result
            })
        } catch (error) {
            console.log(error);
            
        }
    }

    async getConversation(req , res){
        const userId = req.userId || '123123';
        try {
            const result = await this.chatModal.getConversation(userId);
            console.log(result);
            res.status(200).json({
                message: 'Conversation fetched successfully',
                data: result
            })
        } catch (error) {
            console.log(error);
            
        }
    }

    async updateConversationName(req,res){
        try {
            const { conversationId, conversationName } = req.body;
            const userId = req.userId || '123123';
            const result = await this.chatModal.updateConversationName(conversationId, conversationName, userId);
            console.log(result);
            
            res.status(200).json({
                message: 'Conversation name updated successfully',
                data: result
            })
        } catch (error) {
            console.log(error);
            
        }
    }

    async deleteConversation(req,res){
        try {
            const { conversationId } = req.body;
            const userId = req.userId || '123123';
            const result = await this.chatModal.deleteConversation(conversationId, userId);
            console.log(result);
            res.status(200).json({
                message: 'Conversation deleted successfully',
                data: result
            })
        } catch (error) {
            console.log(error);
        }
    }
}

export default ConversationService;