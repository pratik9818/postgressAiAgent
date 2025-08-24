import {CohereClientV2} from 'cohere-ai';
import queryTool from './tools';
import dotenv from 'dotenv';
dotenv.config();
class CohereLLM {
    constructor(){
        this.llmModal = new CohereClientV2({
            token:process.env.COHERE_API_KEY
        });
    };

    async generateSql (userQuery){
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
        return response;
    }

    // modal generate sql and decide to use tool or not
    // validate sql query
    // if validate call tools;
    // send back tool res with prv conversation back to model
    // model generate final response
    // give back to user 

}

export default CohereLLM;