import { Router } from "express";
import verifygoogleToken from "./middleware/verifygoogleToken.js";
import AuthService from "./authService.js";

const authRoutes = Router();

// Initialize AuthService (no database injection needed)
const authService = new AuthService();

// Google OAuth route
authRoutes.post('/google', verifygoogleToken, (req, res, next) => {
    authService.processGoogleAuth(req, res, next);
});

// Logout route
authRoutes.post('/logout', (req, res, next) => {
    authService.logout(req, res, next);
});

// Get current user profile (protected route)
authRoutes.get('/me', (req, res, next) => {
    authService.verifyAccessToken(req, res, (err) => {
        if (err) {
            return next(err);
        }
        authService.getCurrentUser(req, res, next);
    });
});

// Middleware to verify access token for protected routes
export const requireAuth = (req, res, next) => {
    authService.verifyAccessToken(req, res, next);
};

export default authRoutes;
