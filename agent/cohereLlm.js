import {CohereClientV2} from 'cohere-ai';
import queryTool from './tools.js';
import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
class CohereLLM {
    constructor(){
        this.llmModal = new CohereClientV2({
            token:'OFdL2T9rZeenNeQkVItIoowM66YY429w0NISqIaf'
        });
    };
    // modal generate sql and decide to use tool or not

    async toolSelection (userQuery){
        const response = await this.llmModal.chat({
            model:'command-a-03-2025',
            messages:[
                {
                    role:'system',
                    content:`You are an expert SQL agent. generate only read queries and execute them on a PostgreSQL database.`
                },
                {
                    role:'user',
                    content:userQuery
                }
            ],
            tools:[queryTool],
        })
        console.log('intital res',response);
        
        return response;
    }
    // validate sql query
    // --- pending- yet to implement
    // if validate call tools;(
    async readSql (sql){
        const pool = new Pool({
            user: "postgres.xkerkqfhbcvwslcmwykz",
            host: 'aws-0-eu-west-3.pooler.supabase.com',
            database: "postgres",
            password: 'QvRcKfRrlG8isKD6',
            port: 6543,
          });
      try {
        const res = await pool.query(sql.query);
        return JSON.stringify(res.rows);
      } catch (error) {
        console.log(error,'error');
      } finally {
        pool.end();
      }
    }

    async functionExecutionBrain(functionName,sqlQuery){
        const sql = JSON.parse(sqlQuery);
        if(functionName == 'read_query'){
            return await this.readSql(sql);
        }
    }
    // send back tool res with prv conversation back to model
    // model generate final response

    async llmModalResponse(toolid , result , messages , modalres,toolCalls){
      try {
        
        const res =  await this.llmModal.chat({
            model: 'command-a-03-2025',
            messages: [
              {
                role: 'system',
                content: `You are an expert SQL agent. generate SELECT queries and execute them on a PostgreSQL database.`
              },
              {
                role: 'user',
                content: messages
              },
              {
                role: 'assistant',
                content: modalres.message.content, // ✅ the generated assistant reply
                toolCalls: toolCalls
              },
              {
                role: 'tool',
                toolCallId: toolid,
                content: result
              }
            ]
          });
          return res.message.content[0];
      } catch (error) {
        console.log(error,'error');
        
      }
    }
    // give back to user 
    

}

export default CohereLLM;