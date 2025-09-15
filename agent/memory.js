import ChatModal from "./chatModal.js";
import {workerLogger} from "../logger/pino.js";
class Memory {
  constructor(conversationId, userQuery, chatId, userId) {
    this.chatModal = new ChatModal();
    this.conversationId = conversationId;
    this.userQuery = userQuery;
    this.chatId = chatId;
    this.userId = userId;
    this.chatsLimit = 2;
  }
  async getDatabaseSchema() {
    // here i have connect user db and get his db schema for more context - i have to think how to do this !
  }
  //get chat summary of conversation if persent;
  async getSummary() {
    try {
      return await this.chatModal.getChatSummary(this.conversationId);
    } catch (error) {
      workerLogger.error(error, "error in getting chat summary");
      throw error;
    }
  }

  //last 10 chat of that converstation;

  async getLastChats() {
    try {
      return await this.chatModal.getChats(
        this.conversationId,
        this.userId,
        this.chatsLimit
      );
    } catch (error) {
      workerLogger.error(error, "error in getting last chats");
      throw error;
    }
  }

  async memoryContext() {
    try {
      const chatSummary = await this.getSummary();

      const lastChats = await this.getLastChats();
      
      const context = `Conversation summary: ${chatSummary?.summary}
    Recent chat history: ${lastChats.map((chat) => chat?.content).join("\n")}
    Current user request: ${this.userQuery}
`;
      return context;
    } catch (error) {
      workerLogger.error(error, "error in getting memory context");
      throw error;
    }
  }
  async saveLlmResponse(conversationId, userId, role, content,dbData) {
    try {
      return await this.chatModal.saveLlmChat(
        conversationId,
        userId,
        role,
        content,
        dbData
      );
    } catch (error) {
      workerLogger.error(error, "error in saving llm response");
      throw error;
    }
  }
  //user current query;
}
export default Memory;
