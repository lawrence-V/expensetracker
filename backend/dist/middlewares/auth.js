"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkResourceOwnership = exports.validateRefreshToken = exports.requireAuth = exports.optionalAuth = exports.authenticateToken = void 0;
const jwt_1 = require("../utils/jwt");
const api_response_1 = require("../models/api-response");
const logger_1 = __importDefault(require("../utils/logger"));
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            const errorResponse = (0, api_response_1.createErrorResponse)('Access token required', 'No authorization header provided', 401);
            res.status(401).json(errorResponse);
            return;
        }
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;
        if (!token) {
            const errorResponse = (0, api_response_1.createErrorResponse)('Access token required', 'No token provided', 401);
            res.status(401).json(errorResponse);
            return;
        }
        const decoded = jwt_1.JwtUtils.verifyAccessToken(token);
        req.user = decoded;
        logger_1.default.info(`User ${decoded.userId} authenticated successfully`);
        next();
    }
    catch (error) {
        logger_1.default.error('Authentication failed:', error);
        if (error instanceof api_response_1.ApiError) {
            const errorResponse = (0, api_response_1.createErrorResponse)(error.message, error.message, error.statusCode);
            res.status(error.statusCode).json(errorResponse);
        }
        else {
            const errorResponse = (0, api_response_1.createErrorResponse)('Authentication failed', 'Invalid token', 401);
            res.status(401).json(errorResponse);
        }
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            next();
            return;
        }
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;
        if (!token) {
            next();
            return;
        }
        try {
            const decoded = jwt_1.JwtUtils.verifyAccessToken(token);
            req.user = decoded;
            logger_1.default.info(`User ${decoded.userId} authenticated successfully (optional)`);
        }
        catch (error) {
            logger_1.default.warn('Optional authentication failed:', error);
        }
        next();
    }
    catch (error) {
        logger_1.default.error('Optional authentication error:', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireAuth = (req, res, next) => {
    if (!req.user) {
        const errorResponse = (0, api_response_1.createErrorResponse)('Authentication required', 'User not authenticated', 401);
        res.status(401).json(errorResponse);
        return;
    }
    next();
};
exports.requireAuth = requireAuth;
const validateRefreshToken = (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            const errorResponse = (0, api_response_1.createErrorResponse)('Refresh token required', 'No refresh token provided', 400);
            res.status(400).json(errorResponse);
            return;
        }
        const decoded = jwt_1.JwtUtils.verifyRefreshToken(refreshToken);
        req.user = decoded;
        logger_1.default.info(`Refresh token validated for user ${decoded.userId}`);
        next();
    }
    catch (error) {
        logger_1.default.error('Refresh token validation failed:', error);
        if (error instanceof api_response_1.ApiError) {
            const errorResponse = (0, api_response_1.createErrorResponse)(error.message, error.message, error.statusCode);
            res.status(error.statusCode).json(errorResponse);
        }
        else {
            const errorResponse = (0, api_response_1.createErrorResponse)('Invalid refresh token', 'Refresh token validation failed', 401);
            res.status(401).json(errorResponse);
        }
    }
};
exports.validateRefreshToken = validateRefreshToken;
const checkResourceOwnership = (req, res, next) => {
    try {
        if (!req.user) {
            const errorResponse = (0, api_response_1.createErrorResponse)('Authentication required', 'User not authenticated', 401);
            res.status(401).json(errorResponse);
            return;
        }
        const currentUserId = req.user.userId;
        const resourceUserId = req.params.userId || req.body.userId;
        if (resourceUserId && currentUserId !== resourceUserId) {
            const errorResponse = (0, api_response_1.createErrorResponse)('Access denied', 'You can only access your own resources', 403);
            res.status(403).json(errorResponse);
            return;
        }
        next();
    }
    catch (error) {
        logger_1.default.error('Resource ownership check failed:', error);
        const errorResponse = (0, api_response_1.createErrorResponse)('Access control error', 'Failed to verify resource ownership', 500);
        res.status(500).json(errorResponse);
    }
};
exports.checkResourceOwnership = checkResourceOwnership;
//# sourceMappingURL=auth.js.map