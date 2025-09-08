import database from '../database/db.js';
import { workerLogger } from '../logger/pino.js';

class tokenModal{
    async getSubDetails(userid){
       try {
        const res = await database.getDatabase().collection('subscription').findOne({userid});
        return res;
       } catch (error) {
        throw new Error(error, "error in getSubDetails");
       }
    }
    async updateTokenInDb(tokenUsage,userid){
       try {
        const res = await database.getDatabase().collection('subscription').updateOne({userid},{$set:{tokenUsage}});
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