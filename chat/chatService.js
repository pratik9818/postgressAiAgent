import ChatModal from "./chatModal.js";

class ChatService {
  constructor() {
    this.chatModal = new ChatModal();
  }
  async getchats(req, res) {
    const userId = "1" || req.userId;
    const { conversationId } = req.body;
    if (!conversationId)
      res.status(400).json({ message: "Conversation id is required" });
    try {
      const result = await this.chatModal.getChats(conversationId, userId);
      console.log(result);
      res.status(200).json({
        message: "Chats fetched successfully",
        data: result,
      });
    } catch (error) {
        console.log(error);
    }
  }
}
export default ChatService;
