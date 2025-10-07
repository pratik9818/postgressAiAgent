// thinking will done in 3 step
// 1- prv chat , tables name and user query feed to schema selection llm 
//2- schema and its data and use query feed to main sql genertator llm
//3- data send to insight llm to give insight

//1st process
// 1. prv chat , tables name and user query feed to schema selection llm 
// 2. will get json - in json - bunctch of query
// 3. make sure sql query array lenght do not exceed 50 sql . 
// 4. excuate all sql in bulk if possible 
//5. structure whole result , send to main sql generato llm 
// in case of error like sql excuation in user db , llm itself or any other unknown reason treat differenl
// if llm not want to use tool then it can res. based on prv chat . return res back to worker
import { CohereClientV2 } from "cohere-ai";
import queryTool from "./tools.js";
import { workerLogger } from "../logger/pino.js";
import { cohereModal, rowLimit } from "../utils/constant.js";
class ThinkingEngine{
    constructor(){
        this.llmModal = new CohereClientV2({
            token: process.env.COHERE_TOKEN,
          });
        
    }

    //note - context will be object - {userquery, prvchat , tablename}
    
}