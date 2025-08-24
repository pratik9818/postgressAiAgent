import {Queue} from 'bullmq';
import {Redis} from 'ioredis';
const connection = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
})

const queryProcessingQueue = new Queue('queryProcessing', {connection});
export default queryProcessingQueue;