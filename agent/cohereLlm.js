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
  
  async schemaSelectionLlm(context){
    // const {prvChat , tablesName , userQuery} = context;
    try {
        const response = await this.llmModal.chat({
            model: cohereModal.currentModal,
            messages: [
              {
                role: "system",
                content: `You are a SQL query planner.
    
    Your job is to analyze the user's natural language request and a list of available table names, and then decide which tables are relevant. 
    
    You must output a JSON object that includes:
    1. "needed_tables" → an array of table names that are likely required.
    2. "sql" → an array of SQL queries that will help fetch the necessary information about these tables. 
       - For each needed table, include:
         a) A query to get its schema (column names and types) from 'information_schema.columns'.
         b) A query to fetch a small sample of data (e.g., 5 rows).
    
    ### Rules:
    - Always return valid JSON only.
    - Do NOT generate insights or final SQL for answering the user’s question — just schema discovery queries.
    - Use table names exactly as given.
    - Be conservative: if unsure, include the table (better to fetch extra schemas than miss something).
    - Limit sample data queries with 'LIMIT 3'.
    
    ### Example Input:
    User query: "Find the top 3 customers by revenue last month."
    Tables: ["users", "orders", "products", "reviews"]
    
    ### Example Output:
    {
      "needed_tables": ["users", "orders"],
      "sql": [
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';",
        "SELECT * FROM users LIMIT 3;",
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders';",
        "SELECT * FROM orders LIMIT 3;"
      ]
    }
    `
              },
              {
                role: "user",
                content: context,
              },
            ],
            tools: [queryTool],
          });
          console.log(response.message.content);
          
          return response;
    } catch (error) {
        workerLogger.error(error , 'error in schema selection llm')
        throw error
    }
}

// async sqlGeneratorLlm(){}

  async sqlGeneratorLlm(toolid, result, messages, modalres, toolCalls) {
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
        tools: [queryTool],
      });
      return res;
    } catch (error) {
      workerLogger.error(error, "error in final llm modal response");
      throw error;
    }
  }
  
  async insightGeneratorLlm(toolid, result, messages, modalres, toolCalls) {
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
