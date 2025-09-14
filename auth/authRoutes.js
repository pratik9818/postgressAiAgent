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


export default authRoutes;
