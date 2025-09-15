import { appLogger } from "../logger/pino.js";
import ChatModal from "./chatModal.js";

class ChatService {
  constructor() {
    this.chatModal = new ChatModal();
  }
  async getchats(req, res) {
    const userId = req.userId;
    const { conversationId , skipValue } = req.query;
    
    if (!conversationId)
      res.status(400).json({ message: "Conversation id is required" });
    try {
      const result = await this.chatModal.getChats(conversationId, userId , Number(skipValue));
      
      appLogger.info(result , 'chats fetched successfully');
      res.status(200).json({
        message: "Chats fetched successfully",
        data: result,
      });
    } catch (error) {
      appLogger.error(error,'error in getting chats');  
      res.status(500).json({
        message: "something went wrong in getting chats from mogodb",
        error:error
      });
    }
  }
  async getchatDbdata(req, res) {
    const userId = req.userId;
    const { chatId } = req.query;
    console.log(chatId);
    
    if (!chatId)
      res.status(400).json({ message: "chatId id is required" });
    try {
      const result = await this.chatModal.getChatDbData(userId , chatId);
      
      appLogger.info(result , 'chats db data fetched successfully');
      res.status(200).json({
        message: "Chat db data fetched successfully",
        data: result,
      });
    } catch (error) {
      appLogger.error(error,'error in getting chats db data');  
      res.status(500).json({
        message: "something went wrong in getting chats db data from mogodb",
        error:error
      });
    }
  }
}
export default ChatService;
