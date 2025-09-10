import { CohereClientV2 } from "cohere-ai";
import queryTool from "./tools.js";
import dotenv from "dotenv";
import { workerLogger } from "../logger/pino.js";
import { cohereModal, rowLimit } from "../utils/constant.js";
dotenv.config();
class CohereLLM {
  constructor() {
    this.llmModal = new CohereClientV2({
      token: "OFdL2T9rZeenNeQkVItIoowM66YY429w0NISqIaf",
    });
  }

  async toolSelection(userQuery) {
    try {
      const response = await this.llmModal.chat({
        model: cohereModal.currentModal,
        messages: [
          {
            role: "system",
            content: `You are an expert SQL agent. generate only read queries with limit ${rowLimit}.`,
          },
          {
            role: "user",
            content: userQuery,
          },
        ],
        tools: [queryTool],
      });

      return response;
    } catch (error) {
      workerLogger.error(error, "error in tool selection");
      throw error;
    }
  }

  async llmModalResponse(toolid, result, messages, modalres, toolCalls) {
    try {
      const res = await this.llmModal.chat({
        model: cohereModal.currentModal,
        messages: [
          {
            role: "system",
            content: `You are a data interpretation assistant. 
                      The user asked a question that was converted into SQL and executed on their PostgreSQL database. 
                      Your tasks:
                      1. Understand the result set and what it means in the context of the SQL query and in the context of the user query.
                      2. Provide a short, clear summary of the key insight 
                      3. apart from insight give also all data of sql result
                      `
          },
          {
            role: "user",
            content: messages,
          },
          {
            role: "assistant",
            content: modalres.message.content, // ✅ the generated assistant reply
            toolCalls: toolCalls,
          },
          {
            role: "tool",
            toolCallId: toolid,
            content: result,
          },
        ],
      });
      return res;
    } catch (error) {
      workerLogger.error(error, "error in final llm modal response");
      throw error;
    }
  }
  // 3. Recommend the best way to display the result:
  // - "table" → if raw rows are useful (keep in mind UI will paginate).
  // - "chart" → if the result is aggregated or has trends/patterns (suggest chart type: line, bar, pie, etc.).
  // - "summary" → if it is a single number, percentage, or very small dataset.

  async queryValidationErrorResponse(
    messages,
    modalres,
    toolCalls,
    error,
    toolid
  ) {
    try {
      const res = await this.llmModal.chat({
        model: cohereModal.currentModal,
        messages: [
          {
            role: "system",
            content: `You are an expert in error and explain reason why query excuation failed.`,
          },
          {
            role: "user",
            content: messages,
          },
          {
            role: "assistant",
            content: modalres.message.content, // ✅ the generated assistant reply
            toolCalls: toolCalls,
          },
          {
            role: "tool",
            toolCallId: toolid,
            content: error,
          },
        ],
      });
      return res;
    } catch (error) {
      workerLogger.error(
        error,
        "error in query validation error response in llm modal"
      );
      throw error;
    }
  }
}

export default CohereLLM;
