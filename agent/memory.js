import ChatModal from "./chatModal";

class Memory {
  constructor(conversationId, userQuery, chatId, userId) {
    this.chatModal = new ChatModal();
    this.conversationId = conversationId;
    this.userQuery = userQuery;
    this.chatId = chatId;
    this.userId = userId;
    this.chatSummary = null;
    this.lastChats = [];
    this.chatsLimit = 10;
  }
  async getDatabaseSchema(){
    // here i have connect user db and get his db schema for more context - i have to think how to do this !
  }
  //get chat summary of conversation if persent;
  async getSummary() {
    const chatSummary = await this.chatModal.getChatSummary(
      this.conversationId
    );
    console.log(chatSummary);
    this.chatSummary = chatSummary;
  }

  //last 10 chat of that converstation;

  async getLastChats() {
    const lastChats = await this.chatModal.getChats(
      this.conversationId,
      this.userId,
      this.chatsLimit
    );
    console.log(lastChats);
    this.lastChats = lastChats;
  }

  memoryContext() {
    this.getSummary();
    this.getLastChats();
    const context = `Conversation summary: ${this.chatSummary}
    Recent chat history: ${this.lastChats}
    Current user request: ${this.userQuery}
    Do not explain . output only SQL query.
`;
    return context;
  }

  //user current query;
}
export default Memory; 
