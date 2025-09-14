import express from 'express';
import cors from 'cors';
import database from './database/db.js';

import authRoutes from './auth/authRoutes.js';
import chatRoutes from './agent/chatRoutes.js';
import clientDbRoutes from './clientDbAuth/dbRoutes.js';
import {appLogger} from './logger/pino.js';
import realChatRoutes from './chat/routes.js';
import verifyJwtToken from './auth/middleware/verifyJwtToken.js';
// Load environment variables

const app = express();
const port = 3000;

// Middleware
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Routes
app.use('/api/auth', authRoutes);
app.use(verifyJwtToken);
app.use('/api/agent', chatRoutes);
app.use('/api/clientdb', clientDbRoutes);
app.use('/api',realChatRoutes)
// Protected route example
app.get('/api/protected', (req, res) => {
    res.json({
        success: true,
        message: 'This is a protected route',
        user: req.userId
    });
});

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    appLogger.error('Error:', error);
    
    if (error.status) {
        return res.status(error.status).json({
            success: false,
            message: error
        });
    }
    
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Connect to database and start server
async function startServer() {
    try {
        await database.connect();
        console.log('Database connected successfully');
        appLogger.info('Database connected successfully');
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
            appLogger.info(`Server is running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        appLogger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    appLogger.info('SIGTERM received, shutting down gracefully');
    await database.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    appLogger.info('SIGINT received, shutting down gracefully');
    // await worker.close();
    // await connection.quit();
    await database.disconnect();
    process.exit(0);
});

export default app; 
        