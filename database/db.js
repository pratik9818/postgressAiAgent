import { MongoClient } from 'mongodb';
import {appLogger} from '../logger/pino.js'
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const url = process.env.MAIN_DATABASE_URL;
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
