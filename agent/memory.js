import ChatModal from "./chatModal.js";

class Memory {
  constructor(conversationId, userQuery, chatId, userId) {
    this.chatModal = new ChatModal();
    this.conversationId = conversationId;
    this.userQuery = userQuery;
    this.chatId = chatId;
    this.userId = userId;
    this.chatsLimit = 10;
  }
  async getDatabaseSchema(){
    // here i have connect user db and get his db schema for more context - i have to think how to do this !
  }
  //get chat summary of conversation if persent;
  async getSummary() {
    return await this.chatModal.getChatSummary(
      this.conversationId
    );
  }

  //last 10 chat of that converstation;

  async getLastChats() {
    return await this.chatModal.getChats(
      this.conversationId,
      this.userId,
      this.chatsLimit
    );
  }

  async memoryContext() {
    const chatSummary = await this.getSummary();
    
    const lastChats = await this.getLastChats();
    
    const context = `Conversation summary: ${chatSummary?.summary}
    Recent chat history: ${lastChats.map(chat => chat.chat).join('\n')}
    Current user request: ${this.userQuery}
`;
    return context;
  }
  async saveLlmResponse(conversationId,userId,role,content){
    return await this.chatModal.saveLlmChat(conversationId,userId,role,content);
}
  //user current query;
}
export default Memory; 
