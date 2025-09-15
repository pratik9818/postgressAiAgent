import express from 'express';
import ConversationService from './conversationService.js';
import ChatService from './chatService.js';
const route = express.Router();

const conversationService = new ConversationService()
const chatService = new ChatService()
route.post('/conversation', conversationService.createConversation.bind(conversationService));
route.get('/conversation', conversationService.getConversation.bind(conversationService));
route.put('/conversation', conversationService.updateConversationName.bind(conversationService));
route.delete('/conversation', conversationService.deleteConversation.bind(conversationService));

route.get('/chats', chatService.getchats.bind(chatService));
route.get('/chat/dbdata', chatService.getchatDbdata.bind(chatService));
export default route;