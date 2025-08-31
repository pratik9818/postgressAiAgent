import {Queue,QueueEvents} from 'bullmq';
import {Redis} from 'ioredis';
import {appLogger} from '../logger/pino.js';
const connection = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
})

const queryProcessingQueue = new Queue('queryProcessing', {connection});
const queueEvents = new QueueEvents("queryProcessing", { connection });
await queueEvents.waitUntilReady();
appLogger.info('queue initialized');
export {queryProcessingQueue,queueEvents};
