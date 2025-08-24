import { MongoClient } from 'mongodb';
// import dotenv from 'dotenv';

// dotenv.config();

const url = process.env.MONGODB_URI || '';

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
            console.error('MongoDB connection error:', error);
            throw error;
        }
    }

    getDatabase() {
        if (!this.isConnected) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }

    async disconnect() {
        if (this.isConnected) {
            await this.client.close();
            this.isConnected = false;
            console.log('MongoDB disconnected');
        }
    }
}

// Create singleton instance
const database = new Database()


// Export the singleton instance
export default database;
