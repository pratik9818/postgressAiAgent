import express from "express";
const router = express.Router();
import ChatService from "./chatService.js";
const chatService = new ChatService();

router.post("/user/chat", chatService.processUserQuery.bind(chatService));
export default router;