import { Worker } from 'bullmq';
import {Redis} from 'ioredis';
import Memory from './memory';
const connection = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
})

const worker = new Worker(
    'queryProcessing',
    async (job)=>{
        console.log(job);
        //get memory context;
        const memory = new Memory(job.data.conversationId,job.data.userQuery,job.data.chatId,job.data.userId);
        const memoryContext = memory.memoryContext();
        console.log(memoryContext);
        //feed to modal;
        //vaidate sql
        //call function
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