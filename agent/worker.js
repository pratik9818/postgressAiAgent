import { Worker } from 'bullmq';
import {Redis} from 'ioredis';
import Memory from './memory.js';
import CohereLLM from './cohereLlm.js';
import database from '../database/db.js';
import ChatModal from './chatModal.js';
await database.connect();
console.log('Database connected successfully');
const connection = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
})

const worker = new Worker(
    'queryProcessing',
    async (job)=>{
        // console.log(job);
        //get memory context;
        
        const memory = new Memory(job.data.conversationId,job.data.query,job.data.chatid,job.data.userid);
        const memoryContext = await memory.memoryContext();
        console.log(memoryContext);
        //feed to modal;
        const cohereLlm = new CohereLLM();
        const response = await cohereLlm.toolSelection(memoryContext);
        console.log(response.message.toolCalls);
        const {id,function:{name:toolname,arguments:sqlquery}} = response.message.toolCalls[0];
        const savellmRes = await memory.saveLlmResponse(job.data.conversationId,job.data.userid,'assistant',response.message.toolPlan + ' ' + response.message.toolCalls[0]);
        console.log(savellmRes,'saved llm chat');
        
        //vaidate sql
        //call function
        const result = await cohereLlm.functionExecutionBrain(toolname,sqlquery);
        console.log(result,'fetched user data according to user query');
        const finalResponse = await cohereLlm.llmModalResponse(id,result,job.data.query,response,response.message.toolCalls);
        console.log(finalResponse,'final response');
        const savellmRes2 = await memory.saveLlmResponse(job.data.conversationId,job.data.userid,'assistant',finalResponse.text);
        console.log(savellmRes2,'saved llm chat');
        //save res to db
        // res send to client via server site response
    },  
    {connection}
)
worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} has completed!`);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed: ${err.message}`);
  });