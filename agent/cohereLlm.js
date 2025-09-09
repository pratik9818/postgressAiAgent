import {CohereClientV2} from 'cohere-ai';
import queryTool from './tools.js';
import dotenv from 'dotenv';
import {workerLogger} from '../logger/pino.js';
import {cohereModal} from '../utils/constant.js';
dotenv.config();
class CohereLLM {
    constructor(){
        this.llmModal = new CohereClientV2({
            token:'OFdL2T9rZeenNeQkVItIoowM66YY429w0NISqIaf'
        });
    };

    async toolSelection (userQuery){
      try {
        const response = await this.llmModal.chat({
          model:cohereModal.currentModal,
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
      
      return response;
      } catch (error) {
        workerLogger.error(error, "error in tool selection");
        throw error;
      }
    }

    async llmModalResponse(toolid , result , messages , modalres,toolCalls){
      try {
        const res =  await this.llmModal.chat({
            model: cohereModal.currentModal,
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
          return res;
      } catch (error) {
        workerLogger.error(error, "error in final llm modal response");
        throw error;
      }
    }

    async queryValidationErrorResponse( messages , modalres,toolCalls,error,toolid){
      try {
        
        const res =  await this.llmModal.chat({
            model: cohereModal.currentModal,
            messages: [
              {
                role: 'system',
                content: `You are an expert in error and explain reason why query excuation failed.`
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
                content: error
              }
            ]
          });
          return res;
      } catch (error) {
        workerLogger.error(error, "error in query validation error response in llm modal");
        throw error;
        
      }
    }
}

export default CohereLLM;