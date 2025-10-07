import ChatModal from "./chatModal.js";
import {workerLogger} from "../logger/pino.js";
import { Pinecone } from '@pinecone-database/pinecone'

class VectorDatabase {
  constructor() {
    this.chatModal = new ChatModal();
    this.vectorDatabase = new Pinecone({ apiKey: 'pcsk_5npzEy_RMBrnwMWUg6v9K7x962jwuSMKXW2K9yds2bK18KtQ74UEb5e3pfZ5wjcfWHXyg9' });
    this.nameSpace = null;
    this.indexName = 'sql-agent-memory';
    this.indexHost = 'https://sql-agent-memory-9cch11b.svc.aped-4627-b74a.pinecone.io'
    this.indexName2 = "user-tables-name";
    this.indexHost2 =
      "https://user-tables-name-9cch11b.svc.aped-4627-b74a.pinecone.io";
  }

   getNamespace(nameSpace) {
    return this.vectorDatabase.index(this.indexName, this.indexHost).namespace(nameSpace);
  }

  async getChatMemory(conversationId, userQuery, chatId, userId){
    const namespace = this.getNamespace(userId);
    
    try {
      const {result} = await namespace.searchRecords({
        query:{
          topK:5,
          inputs:{text:userQuery},
          filter: {
            category: conversationId   // only return vectors for this chat
          }
        },
        fields:['text'],
      })
      // console.log(result?.hits.map(searchresult => searchresult?.fields?.text).join("\n"));
      return result?.hits.map(searchresult => searchresult?.fields?.text).join("\n");
      
    } catch (error) {
      workerLogger.error('error','getting error in getting memory')
      throw error
    }
  }
  async getTablesNameMemory(userId){
    // const namespace = this.vectorDatabase.index(this.indexName2, this.indexHost2).namespace(userId);
    
    // try {
    //   const {result} = await namespace.searchRecords({
    //     query: {
    //       topK: 5,
    //       inputs: { text: 'tables' },  // dummy text so Pinecone is happy
    //       filter: {
    //         category: userId
    //       }
    //     },
    //     fields: ['text']
    //   })
    //   // console.log(result?.hits.map(searchresult => searchresult?.fields?.text).join("\n"));
    //   console.log(result.hits.fields);
      
    //   return result?.hits?.fields?.text
      
    // } catch (error) {
    //   workerLogger.error('error','getting error in getting memory')
    //   throw error
    // }
    try {
      const res = await this.chatModal.getUserDbTables(userId)
      return res.tablesName;
    } catch (error) {
       workerLogger.error('error','getting error in getting memory')
      throw error
    }
  }
  async saveMemory(conversationId, dbInsight, chatId, userId,userQuery){
    const namespace = this.getNamespace(userId);
    try {
      await namespace.upsertRecords([
        {
          _id:`${userId}_${conversationId}_${chatId}`,
          text: `user query : ${userQuery} and ai reponse : ${dbInsight}`,
          category:conversationId
        }
      ])
    } catch (error) {
      console.log(error);
      workerLogger.error('error','getting error in saving memory')
      throw error
    }
  }
  async deleteMemory(conversationId, chatId, userId){}
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
}

// class Memory {
//   constructor(conversationId, userQuery, chatId, userId) {
//     this.chatModal = new ChatModal();
//     this.conversationId = conversationId;
//     this.userQuery = userQuery;
//     this.chatId = chatId;
//     this.userId = userId;
//     this.chatsLimit = 2;
//     // this.nameSpace = vectorDatabase.index("INDEX_NAME", "INDEX_HOST").namespace("example-namespace");
//   }
  

//   async memoryContext() {
//     try {
//       // const chatSummary = await this.getSummary();

//       const lastChats = await this.getLastChats();
      
//       const context = `Recent chat history: ${lastChats.map((chat) => chat?.content).join("\n")}
//     Current user request: ${this.userQuery}
// `;
//       return context;
//     } catch (error) {
//       workerLogger.error(error, "error in getting memory context");
//       throw error;
//     }
//   }
  
//   //user current query;
// }
export default VectorDatabase;
