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
                throw new AppError({ status: 401, message: 'Authorization header is required' });
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
            throw new AppError({ status: 401, message: 'User not found' });
        }

        // Attach user to request object
        req.userId = decoded.userId;
        authLogger.info(user,'user attached to request object');
        next();

    } catch (error) {
        authLogger.error('Error in verifyAccessToken:', error);
        
        if (error instanceof AppError) {
            next(error);
        } else {
            next(new AppError({ 
                status: 401, 
                message: 'Invalid or expired token' 
            }));
        }
    }
}
export default verifyJwtToken;