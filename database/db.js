import { MongoClient } from 'mongodb';
// import dotenv from 'dotenv';
import {appLogger} from '../logger/pino.js'
// dotenv.config();

const url = 'mongodb+srv://pratiksingh212001:DpXSA3CN2kw1Hc5W@cluster0.7owzguo.mongodb.net/project0?retryWrites=true&w=majority';

class Database {
    constructor() {
        // Simple connection without complex SSL options
        this.client = new MongoClient(url);
        this.db = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            
            if (!this.isConnected) {
                await this.client.connect();
                this.db = this.client.db('project0');
                this.isConnected = true;
                
            }
            return this.db;
        } catch (error) {
            appLogger.error('MongoDB connection error:', error);
            throw error;
        }
    }

    getDatabase() {
        if (!this.isConnected) {
            appLogger.error('Database not connected. Call connect() first.');
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }

    async disconnect() {
        if (this.isConnected) {
            await this.client.close();
            this.isConnected = false;
            appLogger.info('MongoDB disconnected');
        }
    }
}

// Create singleton instance
const database = new Database()


// Export the singleton instance
export default database;
