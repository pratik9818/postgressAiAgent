import database from '../database/db.js';
import { workerLogger } from '../logger/pino.js';

class tokenModal{
    async getSubDetails(userId){
       try {
        const res = await database.getDatabase().collection('subscription').findOne({userId});
        return res;
       } catch (error) {
        throw new Error(error, "error in getSubDetails");
       }
    }
    async updateTokenInDb(tokenUsage,userId){
       try {
        const res = await database.getDatabase().collection('subscription').updateOne({userId},{$set:{tokenUsage}});
        if(res.modifiedCount > 0){
            workerLogger.info('tokenUsage updated');
        }else{
            workerLogger.info('tokenUsage not updated');
        }
        return res;
       } catch (error) {
        throw new Error(error, "error in updateTokenInDb");
       }
    }
}

export default tokenModal