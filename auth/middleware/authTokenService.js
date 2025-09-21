import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/error.js';
import { authLogger } from '../../logger/pino.js';
import dotenv from 'dotenv';
dotenv.config();
class authTokenService {
    constructor() {
        this.secretKey = process.env.JWT_SECRET;
    }

    /**
     * Generate JWT token for user
     * @param {Object} user - User object
     * @returns {string} JWT token
     */
    generateToken(userid) {
        try {
            const payload = {
                userId: userid,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
            };

            const token = jwt.sign(payload, this.secretKey);

            return token;
        } catch (error) {
            authLogger.error('Error generating token:', error);
            throw new AppError(500, 'Error generating authentication token');
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
                throw new AppError(401, 'No token provided');
            }

            const decoded = jwt.verify(token, this.secretKey);
            return decoded;
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                authLogger.error('Error verifying token:', error);
                throw new AppError(401, 'Invalid token');
            } else if (error.name === 'TokenExpiredError') {
                authLogger.error('Error verifying token:', error);
                throw new AppError(401, 'Token expired');
            } else {
                authLogger.error('Error verifying token:', error);
                throw new AppError(500, 'Error verifying token');
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
                throw new AppError(401, 'Invalid authorization header format');
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            return token;
        } catch (error) {
            authLogger.error('Error extracting token:', error);
            throw new AppError(500, 'Error extracting token');
        }
    }

    /**
     * Extract token from query parameters
     * @param {Object} query - Request query object
     * @returns {string} Token
     */
    extractTokenFromQuery(query) {
        try {
            if (!query || !query.token) {
                throw new AppError(401, 'Token is required in query parameters');
            }

            return query.token;
        } catch (error) {
            authLogger.error('Error extracting token from query:', error);
            throw new AppError(500, 'Error extracting token from query');
        }
    }
}

export default authTokenService;
