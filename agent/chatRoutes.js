import express from "express";
const router = express.Router();
import ChatService from "./chatService.js";
const chatService = new ChatService();

router.post("/user/chat", chatService.isUserHasDbCredentials.bind(chatService), chatService.processUserQuery.bind(chatService));
router.get('/sse/job/:jobid', chatService.getJobStatus.bind(chatService));

export default router;