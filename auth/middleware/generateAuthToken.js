import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/error.js';

class GenerateAuthToken {
    constructor() {
        this.secretKey = process.env.JWT_SECRET || 'your-secret-key';
        this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    }

    /**
     * Generate JWT token for user
     * @param {Object} user - User object
     * @returns {string} JWT token
     */
    generateToken(user) {
        try {
            const payload = {
                userId: user._id || user.id,
                email: user.email,
                username: user.username,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
            };

            const token = jwt.sign(payload, this.secretKey);

            return token;
        } catch (error) {
            console.error('Error generating token:', error);
            throw new AppError({ status: 500, message: 'Error generating authentication token' });
        }
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token to verify
     * @returns {Object} Decoded token payload
     */
    verifyToken(token) {
        try {
            if (!token) {
                throw new AppError({ status: 401, message: 'No token provided' });
            }

            const decoded = jwt.verify(token, this.secretKey);
            return decoded;
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                throw new AppError({ status: 401, message: 'Invalid token' });
            } else if (error.name === 'TokenExpiredError') {
                throw new AppError({ status: 401, message: 'Token expired' });
            } else {
                console.error('Error verifying token:', error);
                throw new AppError({ status: 500, message: 'Error verifying token' });
            }
        }
    }

    /**
     * Extract token from authorization header
     * @param {string} authHeader - Authorization header
     * @returns {string} Token
     */
    extractTokenFromHeader(authHeader) {
        try {
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new AppError({ status: 401, message: 'Invalid authorization header format' });
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            return token;
        } catch (error) {
            throw error;
        }
    }
}

export default GenerateAuthToken;
