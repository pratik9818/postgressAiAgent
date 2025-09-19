import { authLogger } from "../../logger/pino.js";
import authTokenService from "./authTokenService.js";
import authModal from "../authModal.js";
const tokenService = new authTokenService();
const authModals = new authModal();
import { AppError } from "../../utils/error.js";
const verifyJwtToken = async (req, res, next) =>{
    try {
        let token;
        
        // Check if this is the SSE endpoint - use query parameter for token
        if (req.path === '/sse/job/:jobid' || req.path.includes('/sse/job/')) {
            authLogger.info('SSE endpoint detected, extracting token from query parameters');
            token = tokenService.extractTokenFromQuery(req.query);
        } else {
            // For all other endpoints, use authorization header
            const authHeader = req.headers.authorization;
            
            if (!authHeader) {
                authLogger.error('Authorization header is required');
                throw new AppError(401, 'Authorization header is required');
            }
            authLogger.info('authHeader successfully extracted');

            // Extract token from header
            token = tokenService.extractTokenFromHeader(authHeader);
        }
        
        authLogger.info('token successfully extracted');
        
        // Verify token
        const decoded = tokenService.verifyToken(token);
        
        authLogger.info('token verified');
        // Find user in database
        const user = await authModals.findUserByUserid(decoded.userId);
        
        authLogger.info(user,'user found');
        if (!user) {
            authLogger.error('User not found');
            throw new AppError(401, 'User not found');
        }

        // Attach user to request object
        req.userId = decoded.userId;
        authLogger.info(user,'user attached to request object');
        next();

    } catch (error) {
        authLogger.error('Error in verifyAccessToken:', error);
        
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            authLogger.error('Invalid JWT token');
            next(new AppError(401, 'Invalid token format'));
        } else if (error.name === 'TokenExpiredError') {
            authLogger.error('JWT token expired');
            next(new AppError(401, 'Token has expired'));
        } else if (error.name === 'NotBeforeError') {
            authLogger.error('JWT token not active');
            next(new AppError(401, 'Token not yet valid'));
        } else if (error instanceof AppError) {
            next(error);
        } else {
            authLogger.error('Unexpected error during token verification:', error);
            next(new AppError(401, 'Authentication failed'));
        }
    }
}
export default verifyJwtToken;