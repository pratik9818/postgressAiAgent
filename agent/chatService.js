import ChatModal from "./chatModal.js";
import {appLogger} from "../logger/pino.js";
import { queryProcessingQueue, queueEvents } from "./queue.js";
class ChatService {
  constructor() {
    this.chatModal = new ChatModal();
  }

  async processUserQuery(req, res, next) {
    const { query, conversationId } = req.body;
    appLogger.info(query, 'query');
    appLogger.info(conversationId, 'conversationId');
    // const userid = req.userid
    if (!query) return res.status(400).json({ message: "Query is required" });
    if (!conversationId) return res.status(400).json({ message: "Conversation id is required" });

    const userid = req.userId;

    try {
      const dbres = await this.chatModal.saveUserQuery(
        query,
        userid,
        conversationId
      );
      appLogger.info(dbres,'saved user query');
      const jobid = await this.sendUserQueryToQueue(
        query,
        userid,
        dbres.insertedId,
        conversationId
      );
      appLogger.info(jobid,'sent user query to queue');
      // AFTER THIS WE NEED TO SEND BACK RES TO THE CLIENT AND ANOTHER PROCESS GOES TO QUEUE;
      return res.status(200).json({
        message: "Fetching result from your db",
        data: dbres,
        jobid: jobid,
      });
    } catch (error) {
      appLogger.error(error,'error in chat service');
      return res
        .status(500)
        .json({ message: "Internal server error - in chat service" });
    }
  }

  async sendUserQueryToQueue(query, userid, chatid, conversationId) {
  try {
    const job = await queryProcessingQueue.add("getUserDbInsight", {
      query,
      userid,
      chatid,
      conversationId,
    });
    return job.id;
  } catch (error) {
    appLogger.error(error,'error in send user query to queue');
    throw error;
  }
  }

  async getJobStatus(req, res, next) {
    const { jobid } = req.params;
    appLogger.info(jobid,'get job status');
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

    // Send initial connection message
    res.write(`event: connected\n`);
    res.write(
      `data: ${JSON.stringify({
        jobId: jobid,
        message: "SSE connection established",
      })}\n\n`
    );
    appLogger.info(jobid,'send initial connection message');

    // Check if job exists
    try {
      const job = await queryProcessingQueue.getJob(jobid);
      if (!job) {
        res.write(`event: error\n`);
        res.write(
          `data: ${JSON.stringify({
            jobId: jobid,
            error: "Job not found",
          })}\n\n`
        );
        appLogger.info(jobid,'send job not found message');
        res.end();
        return;
      }
    } catch (error) {
      appLogger.error(error,'error in get job status');
      res.write(`event: error\n`);
      res.write(
        `data: ${JSON.stringify({
          jobId: jobid,
          error: "Failed to fetch job",
        })}\n\n`
      );
        appLogger.info(jobid,'send job not found message');
      res.end();
      return;
    }

    // Event handler functions
    const handleProgress = ({ jobId: evJobId, data }) => {
      if (evJobId === jobid) {
        appLogger.info(jobid,'send progress message');
        res.write(`event: progress\n`);
        res.write(
          `data: ${JSON.stringify({ jobId: evJobId, progress: data })}\n\n`
        );
      }
    };

    const handleCompleted = ({ jobId: evJobId, returnvalue }) => {
      if (evJobId === jobid) {
        appLogger.info(jobid,'send complete message');
        res.write(`event: complete\n`);
        res.write(
          `data: ${JSON.stringify({ jobId: evJobId, result: returnvalue })}\n\n`
        );
        cleanup();
        res.end();
      }
    };

    const handleFailed = ({ jobId: evJobId, failedReason }) => {
      if (evJobId === jobid) {
        appLogger.info(jobid,'send error message');
        res.write(`event: error\n`);
        res.write(
          `data: ${JSON.stringify({ jobId: evJobId, error: failedReason })}\n\n`
        );
        cleanup();
        res.end();
      }
    };

    // Cleanup function to remove event listeners
    const cleanup = () => {
      queueEvents.off("progress", handleProgress);
      queueEvents.off("completed", handleCompleted);
      queueEvents.off("failed", handleFailed);
    };

    // Add event listeners
    queueEvents.on("progress", handleProgress);
    queueEvents.on("completed", handleCompleted);
    queueEvents.on("failed", handleFailed);

    // Handle client disconnect
    req.on("close", () => {
      appLogger.info(jobid,'client disconnected');
      cleanup();
    });

    // Handle connection errors
    req.on("error", (error) => {
      appLogger.error(error,'SSE connection error');
      cleanup();
    });
  }
}

export default ChatService;
