import AuthModal from './authModal.js';
import GenerateAuthToken from './middleware/authTokenService.js';
import { AppError } from '../utils/error.js';
import { authLogger } from '../logger/pino.js';

class AuthService {
    constructor() {
        this.authModal = new AuthModal();
        this.tokenGenerator = new GenerateAuthToken();
    }

    /**
     * Process Google authentication
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    async processGoogleAuth(req, res, next) {
        try {
            const email = req.email;
            const username = req.username;
            
            authLogger.info(email, 'email');
            authLogger.info(username, 'username');
            if (!email || !username) {
                throw new AppError({ status: 400, message: 'Email and username are required' });
            }

            // Find or create user in database
            const user = await this.authModal.findOrCreateUser(email, username);
            
            authLogger.info(user,'user found');
            if (!user) {
                authLogger.error('Failed to process user authentication');
                throw new AppError({ status: 500, message: 'Failed to process user authentication' });
            }

            // Generate JWT token
            const token = this.tokenGenerator.generateToken(user._id);
            authLogger.info('token generated');
            // Prepare response data
            const responseData = {
                success: true,
                message: 'Authentication successful',
                user: {
                    username: user.username,
                },
                token: {
                    accessToken: token,
                    expiresIn: this.tokenGenerator.expiresIn
                }
            };
            authLogger.info(responseData.user, 'responseData.user');
            // Send response
            res.status(200).json(responseData);
            authLogger.info('response sent');
        } catch (error) {
            authLogger.error('Error in processGoogleAuth:', error);
            if (error instanceof AppError) {
                next(error);
            } else {
                authLogger.error('Error in processGoogleAuth:', error);
                next(new AppError({ 
                    status: 500, 
                    message: 'Internal server error during authentication' 
                }));
            }
        }
    }

    /**
     * Verify access token middleware
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    // async verifyAccessToken(req, res, next) {
    //     try {
    //         const authHeader = req.headers.authorization;
    //         if (!authHeader) {
    //             authLogger.error('Authorization header is required');
    //             throw new AppError({ status: 401, message: 'Authorization header is required' });
    //         }
    //         authLogger.info('authHeader successfully extracted');

    //         // Extract token from header
    //         const token = this.tokenGenerator.extractTokenFromHeader(authHeader);
    //         authLogger.info('token successfully extracted');
    //         // Verify token
    //         const decoded = this.tokenGenerator.verifyToken(token);
    //         authLogger.info('token verified');
    //         // Find user in database
    //         const user = await this.authModal.findUserByUserid(decoded._id);
    //         authLogger.info(user,'user found');
    //         if (!user) {
    //             authLogger.error('User not found');
    //             throw new AppError({ status: 401, message: 'User not found' });
    //         }

    //         // Attach user to request object
    //         req.user = user;
    //         req.token = decoded;
    //         authLogger.info(user,'user attached to request object');
    //         next();

    //     } catch (error) {
    //         authLogger.error('Error in verifyAccessToken:', error);
            
    //         if (error instanceof AppError) {
    //             next(error);
    //         } else {
    //             next(new AppError({ 
    //                 status: 401, 
    //                 message: 'Invalid or expired token' 
    //             }));
    //         }
    //     }
    // }

    /**
     * Logout user (invalidate tokens)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    async logout(req, res, next) {
        try {
            // In a real application, you might want to blacklist the token
            // For now, we'll just return a success response
            // The client should remove the token from storage
            
            const responseData = {
                success: true,
                message: 'Logout successful'
            };
            authLogger.info(responseData,'logout responseData');
            res.status(200).json(responseData);
            authLogger.info('logout response sent');
        } catch (error) {
            authLogger.error('Error in logout:', error);
            if (error instanceof AppError) {
                next(error);
            } else {
                next(new AppError({ 
                    status: 500, 
                    message: 'Internal server error during logout' 
                }));
            }
        }
    }

    /**
     * Get current user profile
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    async getCurrentUser(req, res, next) {
        try {
            const user = req.user;
            authLogger.info(user,'user found');
            if (!user) {
                authLogger.error('User not authenticated');
                throw new AppError({ status: 401, message: 'User not authenticated' });
            }

            const responseData = {
                success: true,
                user: {
                    id: user._id,
                    email: user.email,
                    username: user.username,
                    lastLogin: user.last_login,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at
                }
            };
            authLogger.info(responseData,'responseData');
            res.status(200).json(responseData);

        } catch (error) {
            authLogger.error('Error in getCurrentUser:', error);
            
            if (error instanceof AppError) {
                next(error);
            } else {
                next(new AppError({ 
                    status: 500, 
                    message: 'Internal server error while fetching user profile' 
                }));
            }
        }
    }
}

export default AuthService;