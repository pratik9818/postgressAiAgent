import { Worker } from "bullmq";
import { Redis } from "ioredis";
import Memory from "./memory.js";
import CohereLLM from "./cohereLlm.js";
import database from "../database/db.js";
import SQLExecutor from "./sqlExecutor.js";
import { workerLogger } from "../logger/pino.js";
import TokenTracker from "../tokenTracker/tokenTracker.js";


//NOTE - I THINK I SHOULD RETURN THE DB RESULT TO CLIENT IF TOKEN LIMIT EXCEED SO DESPITE THE SENDING ALL RESULT TO LLM IN CASE OF TOKEN LIMIT EXCEED JUST RETURN DATA DIRECTLY TO FROTEND --------------------------------


// Queue monitoring and health check
let jobStats = {
  totalProcessed: 0,
  totalFailed: 0,
  totalCompleted: 0,
  averageProcessingTime: 0,
  lastJobTime: 0,
  concurrentJobs: 0, // Track concurrent job processing
  maxConcurrentJobs: 0, // Track peak concurrency
};

// Health check function
function logQueueHealth() {
  workerLogger.info("=== Queue Health Check ===");
  workerLogger.info(`Total jobs processed: ${jobStats.totalProcessed}`);
  workerLogger.info(`Total jobs completed: ${jobStats.totalCompleted}`);
  workerLogger.info(`Total jobs failed: ${jobStats.totalFailed}`);
  workerLogger.info(
    `Success rate: ${(
      (jobStats.totalCompleted / jobStats.totalProcessed) *
      100
    ).toFixed(2)}%`
  );
  workerLogger.info(
    `Average processing time: ${jobStats.averageProcessingTime.toFixed(2)}ms`
  );
  workerLogger.info(`Current concurrent jobs: ${jobStats.concurrentJobs}`);
  workerLogger.info(`Peak concurrent jobs: ${jobStats.maxConcurrentJobs}`);
  workerLogger.info("==========================");
}

// Run health check every 5 minutes
setInterval(logQueueHealth, 5 * 60 * 1000);

// Initialize database connection with error handling
let dbConnected = false;
try {
  await database.connect();
  dbConnected = true;
  workerLogger.info("Database connected successfully");
} catch (error) {
  workerLogger.error("Failed to connect to database:", error);
  process.exit(1);
}

// Initialize Redis connection with error handling
let connection;
try {
  connection = new Redis({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: null,
  });

  connection.on("error", (error) => {
    workerLogger.error("Redis connection error:", error);
  });

  connection.on("connect", () => {
    workerLogger.info("Redis connected successfully");
  });
} catch (error) {
  workerLogger.error("Failed to connect to Redis:", error);
  process.exit(1);
}

const cohereLlm = new CohereLLM();
const sqlExecutor = new SQLExecutor();

// Worker Configuration Options
const WORKER_CONFIG = {
  // Concurrency Options (choose one):
  CONCURRENCY: {
    CONSERVATIVE: 1,    // Safe, one job at a time
    MODERATE: 2,        // Balanced performance
    AGGRESSIVE: 3,      // High performance (test first)
    CUSTOM: 2           // Your choice
  },
  
  // Timeout Options (in milliseconds):
  TIMEOUT: {
    SHORT: 30000,       // 30 seconds - for simple queries
    MEDIUM: 60000,     // 60 seconds - current setting
    LONG: 600000,       // 10 minutes - for complex operations
    CUSTOM: 300000      // Your choice
  },
  
  // Backoff Options:
  BACKOFF: {
    FAST: {
      type: "fixed",
      delay: 1000       // 1 second between retries
    },
    MODERATE: {
      type: "exponential",
      delay: 2000       // Current setting: 2s, 4s, 8s...
    },
    SLOW: {
      type: "exponential", 
      delay: 50000       // 5s, 10s, 20s...
    }
  }
};

// Current configuration (modify these values to test)
const CURRENT_CONFIG = {
  concurrency: WORKER_CONFIG.CONCURRENCY.CONSERVATIVE, 
  timeout: WORKER_CONFIG.TIMEOUT.SHORT,
  backoff: WORKER_CONFIG.BACKOFF.SLOW           // Exponential 2s
};

// Validate job data
function validateJobData(data) {
  const requiredFields = ["conversationId", "query", "chatid", "userid"];
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    workerLogger.error(`Missing required fields: ${missingFields.join(", ")}`);
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  if (typeof data.query !== "string" || data.query.trim().length === 0) {
    workerLogger.error("Query must be a non-empty string");
    throw new Error("Query must be a non-empty string");
  }
}

const worker = new Worker(
  "queryProcessing",
  async (job) => {
    workerLogger.info(
      "-------------------------------------------------------"
    );
    workerLogger.info(job.data, "new job come");

    try {
      // Validate job data first
      validateJobData(job.data);
      const tokenTracker = new TokenTracker();
      
      // Get memory context
      workerLogger.info("getting memory context of", job.data.chatid);
      let memory;
      let memoryContext;

      try {
        memory = new Memory(
          job.data.conversationId,
          job.data.query,
          job.data.chatid,
          job.data.userid
        );
        memoryContext = await memory.memoryContext();
        const schema = await sqlExecutor.getUserDbSchema(job.data.userid);
        memoryContext += `\n\nUser database schema: ${schema}`;
        workerLogger.info(memoryContext, "memory context");
        await tokenTracker.track(job.data.userid, memoryContext, 'beforeLLM' , 0);
        await job.updateProgress(10);
      } catch (error) {
        workerLogger.error("Failed to get memory context:", error);
        throw new Error(`Memory context error: ${error}`);
      }

      // Feed to modal
      workerLogger.info("feeding to modal");
      let response;
      try {
        response = await cohereLlm.toolSelection(memoryContext);
        console.log(response.usage.tokens);
        
        workerLogger.info(response, "tool calls");
        console.log(response.usage.tokens,'response.usage.tokens');
        
        const tokens = response.usage.tokens.inputTokens + response.usage.tokens.outputTokens
        console.log(tokens);
        
        await tokenTracker.track(job.data.userid,'','afterLLM',tokens);
        await job.updateProgress(25);
      } catch (error) {
        workerLogger.error("Failed to get tool selection from LLM:", error);
        throw new Error(`LLM tool selection error: ${error}`);
      }

      // Validate response structure
      if (!response?.message?.toolCalls?.[0]) {
          workerLogger.info("missing tool calls---------------------------");
          const savellmRes2 = await memory.saveLlmResponse(
            job.data.conversationId,
            job.data.userid,
            "assistant",
            response.message.content[0].text
          );
          workerLogger.info(savellmRes2, "saved llm chat");
          await job.updateProgress(100);
          
        return {
          success: true,
          response:  response.message.content[0].text,
          conversationId: job.data.conversationId,
          result:null
        };
      
        // throw new Error("Invalid LLM response structure - missing tool calls");
      }

      const {
        id,
        function: { name: toolname, arguments: sqlquery },
      } = response.message.toolCalls[0];

      // Save LLM response and tools called in db
      workerLogger.info("saving llm response and tools called in db");
      try {
        const savellmRes = await memory.saveLlmResponse(
          job.data.conversationId,
          job.data.userid,
          "assistant",
          response.message.toolPlan + " " + response.message.toolCalls[0]
        );
        workerLogger.info(savellmRes, "saved llm chat");
        await job.updateProgress(40);
      } catch (error) {
        workerLogger.error("Failed to save LLM first response in db:", error);
        // Don't throw here, continue with execution
      }

      // Validate SQL and call function
      workerLogger.info("validating sql and calling function");
      let result ;
      let error;
      try {
        const {result:res,error:erra} = await sqlExecutor.executionBrain(
          toolname,
          sqlquery,
          job.data.userid
        );
        result = res ;
        error = erra;
        workerLogger.info(result , error);
        
        workerLogger.info(result, "fetched user data according to user query");
        workerLogger.info(error, "result error");
        await job.updateProgress(60);
      } catch (error) {
        workerLogger.error("Failed to execute SQL:", error);
        throw new Error(`SQL execution error: ${error}`);
      }
      
      
      if (error) {
        await tokenTracker.track(job.data.userid, error , 'beforeLLM' ,0);
        // Handle SQL validation error with retry logic
        workerLogger.warn(
          "SQL validation error detected, generating error response"
        );
        try {
          const finalResponse = await cohereLlm.queryValidationErrorResponse(
            job.data.query,
            response,
            response.message.toolCalls,
            error,
            id
          );
          workerLogger.info(finalResponse, "final response");
          const tokens = finalResponse.usage.tokens.inputTokens + finalResponse.usage.tokens.outputTokens
          await tokenTracker.track(job.data.userid,'','afterLLM',tokens);
          // Save error response
          try {
            const savellmRes2 = await memory.saveLlmResponse(
              job.data.conversationId,
              job.data.userid,
              "assistant",
              finalResponse.message.content[0].text
            );
            workerLogger.info(savellmRes2, "saved llm chat");
          } catch (saveError) {
            workerLogger.error(
              "Failed to save error response of llm modal in db:",
              saveError
            );
            throw new Error(
              `Failed to save error response of llm modal in db: ${saveError}`
            );
          }

          await job.updateProgress(100);
          return {
            success: false,
            error: result.err,
            response: finalResponse.message.content[0].text,
            conversationId: job.data.conversationId,
          };
        } catch (error) {
          workerLogger.error(
            "Failed to generate error response of sql validation by llm modal :",
            error
          );
          throw new Error(
            `Error response generation of sql validation by llm modal : ${error}`
          );
        }
      }
      await tokenTracker.track(job.data.userid, result , 'beforeLLM' ,0);
      // Get final response from modal
      workerLogger.info("getting final response from ai modal");
      let content
      try {
       const finalResponse = await cohereLlm.llmModalResponse(
          id,
          result,
          job.data.query,
          response,
          response.message.toolCalls
        );
         content = finalResponse.message.content[0]
        workerLogger.info(finalResponse, "final response");
        const tokens = finalResponse.usage.tokens.inputTokens + finalResponse.usage.tokens.outputTokens
        await tokenTracker.track(job.data.userid,'','afterLLM',tokens);
        await job.updateProgress(80);
      } catch (error) {
        workerLogger.error("Failed to get final response from LLM:", error);
        throw new Error(`Final LLM response error: ${error}`);
      }

      // Save final response in db
      workerLogger.info("saving final response in db");
      try {
        const savellmRes2 = await memory.saveLlmResponse(
          job.data.conversationId,
          job.data.userid,
          "assistant",
          content.text
        );
        workerLogger.info(savellmRes2, "saved llm chat");
        await job.updateProgress(100);
      } catch (error) {
        workerLogger.error(
          "Failed to save final response of llm modal in db:",
          error
        );
        throw new Error(
          `Failed to save final response of llm modal in db: ${error}`
        );
      }

      // Return the final response for SSE
      workerLogger.info(
        "-------------------------------------------------------"
      );
      return {
        success: true,
        response: content.text,
        conversationId: job.data.conversationId,
        data: result,
      };
    } catch (error) {
      workerLogger.error("Critical error in worker:", error);

      // Try to save error message to conversation history
      try {
        if (job.data?.conversationId && job.data?.userid) {
          const memory = new Memory(
            job.data.conversationId,
            job.data.query,
            job.data.chatid,
            job.data.userid
          );
          await memory.saveLlmResponse(
            job.data.conversationId,
            job.data.userid,
            "assistant",
            `Sorry, I encountered an error while processing your request: ${error}`
          );
        }
      } catch (saveError) {
        workerLogger.error("Failed to save final response in db:", saveError);
        throw new Error(`Failed to save final response in db: ${saveError}`);
      }

      // Return structured error response
      return {
        success: false,
        error: error,
        response: `An error occurred while processing your request: ${error}`,
        conversationId: job.data?.conversationId,
        jobId: job.data?.id,
        userId: job.data?.userid,
      };
    }
  },
  {
    connection,
    // maxStalledCount: 0,
    // stalledInterval: 30000,
    // removeOnComplete: 1000, // Keep last 1000 completed jobs in memory
    removeOnFail: 500, // Keep last 500 failed jobs in memory
    attempts: 1, // Retry failed jobs up to 3 times
    // backoff: CURRENT_CONFIG.backoff,
    // timeout: CURRENT_CONFIG.timeout,
    // concurrency: CURRENT_CONFIG.concurrency,
  }
);

worker.on("completed", (job) => {
  const processingTime = Date.now() - job.timestamp;
  jobStats.totalProcessed++;
  jobStats.totalCompleted++;
  jobStats.lastJobTime = processingTime;
  jobStats.concurrentJobs--; // Decrease concurrent job count

  // Update average processing time
  jobStats.averageProcessingTime =
    (jobStats.averageProcessingTime * (jobStats.totalProcessed - 1) +
      processingTime) /
    jobStats.totalProcessed;

  workerLogger.info(`✅ Job ${job.id} has completed!`);
  workerLogger.info(`Job duration: ${processingTime}ms`);
  workerLogger.info(`Remaining concurrent jobs: ${jobStats.concurrentJobs}`);
});

worker.on("failed", (job, err) => {
  jobStats.totalProcessed++;
  jobStats.totalFailed++;
  jobStats.concurrentJobs--; // Decrease concurrent job count

  workerLogger.error(`❌ Job ${job.id} failed: ${err.message}`);
  workerLogger.error("Job data:", job.data);
  workerLogger.error("Full error:", err);
  workerLogger.error(`Attempts made: ${job.attemptsMade}/${job.opts.attempts}`);

  // Log different types of failures
  if (err.message.includes("timeout")) {
    workerLogger.error("Job failed due to timeout");
  } else if (err.message.includes("SQL")) {
    workerLogger.error("Job failed due to SQL execution error");
  } else if (err.message.includes("LLM")) {
    workerLogger.error("Job failed due to LLM service error");
  }
  
  workerLogger.info(`Remaining concurrent jobs: ${jobStats.concurrentJobs}`);
});

worker.on("error", (err) => {
  workerLogger.error("Worker error:", err);
});

// Add more event handlers for better monitoring
worker.on("stalled", (jobId) => {
  workerLogger.warn(`Job ${jobId} has stalled`);
});

worker.on("waiting", (jobId) => {
  workerLogger.info(`Job ${jobId} is waiting to be processed`);
});

worker.on("active", (job) => {
  jobStats.concurrentJobs++;
  if (jobStats.concurrentJobs > jobStats.maxConcurrentJobs) {
    jobStats.maxConcurrentJobs = jobStats.concurrentJobs;
  }
  workerLogger.info(`Job ${job.id} has started processing`);
  workerLogger.info(`Current concurrent jobs: ${jobStats.concurrentJobs}`);
});

worker.on("progress", (job, progress) => {
  workerLogger.info(`Job ${job.id} progress: ${progress}%`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  workerLogger.info("SIGTERM received, shutting down gracefully");
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  workerLogger.info("SIGINT received, shutting down gracefully");
  await worker.close();
  await connection.quit();
  process.exit(0);
});
