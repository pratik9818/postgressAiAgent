import express from 'express';
import cors from 'cors';
import database from './database/db.js';

import authRoutes from './auth/authRoutes.js';
import chatRoutes from './agent/chatRoutes.js';
import clientDbRoutes from './clientDbAuth/dbRoutes.js';
import {appLogger} from './logger/pino.js';
import realChatRoutes from './chat/routes.js';
import verifyJwtToken from './auth/middleware/verifyJwtToken.js';
import dotenv from 'dotenv';
dotenv.config();
// Load environment variables

const app = express();
const port = process.env.PORT;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
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
app.use((err, req, res, next) => {
    console.error("Error middleware caught:", err);
    appLogger.error("Error middleware caught:", err);
  
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    
    // Determine error type for frontend handling
    let errorType = 'UNKNOWN_ERROR';
    if (status === 401) {
        errorType = 'AUTHENTICATION_ERROR';
    } else if (status === 403) {
        errorType = 'AUTHORIZATION_ERROR';
    } else if (status === 404) {
        errorType = 'NOT_FOUND_ERROR';
    } else if (status === 400) {
        errorType = 'VALIDATION_ERROR';
    } else if (status >= 500) {
        errorType = 'SERVER_ERROR';
    }
    
    // Structured error response for frontend
    const errorResponse = {
        success: false,
        error: {
            type: errorType,
            message: message,
            status: status,
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method
        }
    };
    
    // Add stack trace in development mode
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
    }
    
    res.status(status).json(errorResponse);
  });
  

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            type: 'NOT_FOUND_ERROR',
            message: 'Route not found',
            status: 404,
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method
        }
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
        