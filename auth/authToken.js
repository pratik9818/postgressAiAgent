import jwt from 'jsonwebtoken';
import { authLogger } from '../logger/pino.js'; 
/**
 * Utility class for token-related operations
 */
class AuthTokenUtils {
    /**
     * Decode token without verification (for reading payload)
     * @param {string} token - JWT token
     * @returns {Object} Decoded payload
     */
    static decodeToken(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            authLogger.error('Error decoding token:', error);
            return null;
        }
    }

    /**
     * Check if token is expired
     * @param {string} token - JWT token
     * @returns {boolean} True if expired, false otherwise
     */
    static isTokenExpired(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return true;
            }
            
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp < currentTime;
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true;
        }
    }

    /**
     * Get token expiration time
     * @param {string} token - JWT token
     * @returns {Date|null} Expiration date or null if invalid
     */
    static getTokenExpiration(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return null;
            }
            
            return new Date(decoded.exp * 1000);
        } catch (error) {
            console.error('Error getting token expiration:', error);
            return null;
        }
    }

    /**
     * Get time until token expires (in seconds)
     * @param {string} token - JWT token
     * @returns {number} Seconds until expiration (negative if expired)
     */
    static getTimeUntilExpiration(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return -1;
            }
            
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp - currentTime;
        } catch (error) {
            console.error('Error getting time until expiration:', error);
            return -1;
        }
    }

    /**
     * Validate token format (basic validation)
     * @param {string} token - JWT token
     * @returns {boolean} True if format is valid
     */
    static isValidTokenFormat(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        
        // Basic JWT format validation (3 parts separated by dots)
        const parts = token.split('.');
        return parts.length === 3;
    }
}

export default AuthTokenUtils;
