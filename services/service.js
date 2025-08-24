import { CohereClientV2 } from 'cohere-ai';
import queryTool from '../tool/tool.js'; // Your tool definition
import { Pool } from 'pg';

const pool = new Pool({
  user: "postgres",
  host: '',
  database: "postgres",
  password: '',
  port: 5432,
});

async function runQuery({ query }) {
  console.log(query, 'modal generated query');

  try {
    await pool.connect()
    const result = await pool.query(query);
    console.log(result);

    return JSON.stringify(result.rows);
  } catch (err) {
    return `Error running query: ${err}`;
  }
}

class Agent {
  constructor() {
    this.aimodal = new CohereClientV2({
      token: ''
    });
  }

  async queryExecution(userQuery) {
    // Step 1: Call Cohere to see if it wants to use a tool
    const initialResponse = await this.aimodal.chat({
      model: 'command-a-03-2025',
      messages: [
        {
          role: 'system',
          content: `You are an expert SQL agent. generate SELECT queries and execute them on a PostgreSQL database.`
        },
        {
          role: 'user',
          content: userQuery
        }
      ],
      tools: [queryTool],
    });

    const message = initialResponse.message;
    console.log(initialResponse);

    console.log(message);

    // Step 2: Check if tool is being called
    if (message.toolCalls && message.toolCalls.length > 0) {
      const toolCall = message.toolCalls[0].function; // Only handling 1 tool for now
      console.log(toolCall);

      if (toolCall.name == 'run_postgres_query') {
        console.log(toolCall.arguments);

        const queryParam = JSON.parse(toolCall.arguments).query;
        console.log(queryParam);

        // Step 3: Run the SQL using your tool function
        const queryResult = await runQuery({ query: queryParam });
        console.log(queryResult, 'query result');
        console.log(initialResponse.message.toolCalls[0].id);

        // Step 4: Send result back to the model to get final answer
        const finalResponse = await this.aimodal.chat({
          model: 'command-a-03-2025',
          messages: [
            {
              role: 'system',
              content: `You are an expert SQL agent. generate SELECT queries and execute them on a PostgreSQL database.`
            },
            {
              role: 'user',
              content: userQuery
            },
            {
              role: 'assistant',
              content: initialResponse.message.content, // ✅ the generated assistant reply
              toolCalls: initialResponse.message.toolCalls
            },
            {
              role: 'tool',
              toolCallId: initialResponse.message.toolCalls[0].id,
              content: queryResult
            }
          ]
        });

        console.log(finalResponse);

        return finalResponse.message.content[0].text;
      } else {
        return "Unknown tool requested.";
      }
    } else {
      return message.content[0]?.text || "No tool used or no response generated.";
    }
  }
}

export default Agent;
