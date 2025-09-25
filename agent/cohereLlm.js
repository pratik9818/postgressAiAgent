import { CohereClientV2 } from "cohere-ai";
import queryTool from "./tools.js";
import { workerLogger } from "../logger/pino.js";
import { cohereModal, rowLimit } from "../utils/constant.js";
import dotenv from "dotenv";
dotenv.config();
class CohereLLM {
  constructor() {
    this.llmModal = new CohereClientV2({
      token: process.env.COHERE_TOKEN,
    });
  }
  // async getTableData(userQuery) {
  //   try {
  //     const response = await this.llmModal.chat({
  //       model: cohereModal.currentModal,
  //       messages: [
  //         {
  //           role: "system",
  //           content: `generate sql query to get data from each table according to user query. this data then send to llm to generate `,
  //         },
  //         {
  //           role: "user",
  //           content: userQuery,
  //         },
  //       ],
  //       tools: [queryTool],
  //     });

  //     return response;
  //   } catch (error) {
  //     workerLogger.error(error, "error in tool selection");
  //     throw error;
  //   }
  // }
  async toolSelection(userQuery) {
    try {
      const response = await this.llmModal.chat({
        model: cohereModal.currentModal,
        messages: [
          {
            role: "system",
            content: `
            You are an expert PostgreSQL SQL agent.

Rules:
1. For each user query, you will receive the user's query, the full database schema, and one sample row from each table. Analyze this information carefully. keep in mind that call tools once per user query.
2. Only generate safe, read-only queries (SELECT only). Never use INSERT, UPDATE, DELETE, DROP, or DDL.
3. Every query must include LIMIT ${rowLimit} unless explicitly asked for aggregates (e.g. COUNT, SUM, AVG).
4. Handle JSON and JSONB fields carefully:
   - Use '->' for JSON objects.
   - Use '->>' for JSON text values.
   - Cast JSON/JSONB properly when needed (e.g. ::jsonb, ::text, ::numeric).
   - If filtering inside JSON, use operators like jsonb_extract_path_text, @>, or ? where appropriate.
5. Resolve type mismatches by casting (e.g. CAST(column AS INTEGER), column::numeric).
6. Always qualify ambiguous column names with their table alias.
7. Do not explain the query, just return the SQL string.
8. Ensure the query is syntactically valid PostgreSQL.
            `,
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

Your responsibilities:
1. Analyze the SQL query and the result set together to understand what the data represents.  
2. Interpret the results **in the context of the user’s original question** — not just in database terms.  
3. Summarize findings in a clear, human-friendly way, highlighting **patterns, trends, anomalies, or key takeaways**.  
4. Where useful, include **comparisons, percentages, averages, or counts** to make insights more meaningful.  
5. Avoid repeating raw SQL or database jargon unless necessary; always explain in plain language.  
6. If the result set is empty, explain possible reasons and suggest next steps (e.g., adjusting filters, checking data availability).  
7. Keep your response concise but **insight-rich**, structured, and directly actionable for the user.  

                      `,
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
