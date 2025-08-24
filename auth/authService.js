import AuthModal from './authModal.js';
import GenerateAuthToken from './middleware/generateAuthToken.js';
import { AppError } from '../utils/error.js';

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
            
            if (!email || !username) {
                throw new AppError({ status: 400, message: 'Email and username are required' });
            }

            // Find or create user in database
            const user = await this.authModal.findOrCreateUser(email, username);
            
            if (!user) {
                throw new AppError({ status: 500, message: 'Failed to process user authentication' });
            }

            // Generate JWT token
            const token = this.tokenGenerator.generateToken(user.email);

            // Prepare response data
            const responseData = {
                success: true,
                message: 'Authentication successful',
                user: {
                    id: user._id,
                    email: user.email,
                    username: user.username,
                    lastLogin: user.last_login
                },
                token: {
                    accessToken: token,
                    expiresIn: this.tokenGenerator.expiresIn
                }
            };

            // Send response
            res.status(200).json(responseData);

        } catch (error) {
            console.error('Error in processGoogleAuth:', error);
            
            if (error instanceof AppError) {
                next(error);
            } else {
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
    async verifyAccessToken(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader) {
                throw new AppError({ status: 401, message: 'Authorization header is required' });
            }

            // Extract token from header
            const token = this.tokenGenerator.extractTokenFromHeader(authHeader);
            
            // Verify token
            const decoded = this.tokenGenerator.verifyToken(token);
            
            // Find user in database
            const user = await this.authModal.findUserByEmail(decoded.email);
            
            if (!user) {
                throw new AppError({ status: 401, message: 'User not found' });
            }

            // Attach user to request object
            req.user = user;
            req.token = decoded;
            
            next();

        } catch (error) {
            console.error('Error in verifyAccessToken:', error);
            
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

            res.status(200).json(responseData);

        } catch (error) {
            console.error('Error in logout:', error);
            
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
            
            if (!user) {
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

            res.status(200).json(responseData);

        } catch (error) {
            console.error('Error in getCurrentUser:', error);
            
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