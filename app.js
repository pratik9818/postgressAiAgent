import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import database from './database/db.js';

import authRoutes, { requireAuth } from './auth/authRoutes.js';
import chatRoutes from './agent/chatRoutes.js';
// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agent', chatRoutes);

// Protected route example
app.get('/api/protected', requireAuth, (req, res) => {
    res.json({
        success: true,
        message: 'This is a protected route',
        user: req.user
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
    console.error('Error:', error);
    
    if (error.status) {
        return res.status(error.status).json({
            success: false,
            message: error.message
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
        
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
            console.log('Available routes:');
            console.log('- POST /api/auth/google - Google OAuth login');
            console.log('- POST /api/auth/logout - Logout user');
            console.log('- GET /api/auth/me - Get current user profile');
            console.log('- GET /api/protected - Protected route example');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await database.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await database.disconnect();
    process.exit(0);
});

export default app; 
        