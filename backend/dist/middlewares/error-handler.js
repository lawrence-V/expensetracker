"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRedisError = exports.handleDatabaseError = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const api_response_1 = require("../models/api-response");
const logger_1 = __importDefault(require("../utils/logger"));
const env_1 = __importDefault(require("../config/env"));
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    logger_1.default.error('Error caught by global handler:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId || 'anonymous',
    });
    let statusCode = 500;
    let message = 'Internal Server Error';
    let errorDetails = 'Something went wrong';
    if (err instanceof api_response_1.ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        errorDetails = err.message;
    }
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        errorDetails = err.message;
    }
    else if (err.name === 'MongoServerError') {
        const mongoError = err;
        if (mongoError.code === 11000) {
            const field = Object.keys(mongoError.keyPattern)[0];
            statusCode = 409;
            message = 'Duplicate Entry';
            errorDetails = `${field} already exists`;
        }
        else {
            statusCode = 500;
            message = 'Database Error';
            errorDetails = 'A database error occurred';
        }
    }
    else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID Format';
        errorDetails = 'The provided ID is not valid';
    }
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid Token';
        errorDetails = 'Authentication token is invalid';
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token Expired';
        errorDetails = 'Authentication token has expired';
    }
    else if (err.name === 'SyntaxError' && 'body' in err) {
        statusCode = 400;
        message = 'Invalid JSON';
        errorDetails = 'Request body contains invalid JSON';
    }
    const errorResponse = (0, api_response_1.createErrorResponse)(message, env_1.default.nodeEnv === 'development' ? err.stack || errorDetails : errorDetails, statusCode);
    errorResponse.path = req.originalUrl;
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res, next) => {
    const errorResponse = (0, api_response_1.createErrorResponse)('Not Found', `The endpoint ${req.originalUrl} does not exist`, 404);
    errorResponse.path = req.originalUrl;
    logger_1.default.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId || 'anonymous',
    });
    res.status(404).json(errorResponse);
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const handleDatabaseError = (error) => {
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
        return new api_response_1.ApiError('Database connection failed', 503);
    }
    if (error.name === 'MongoServerError' && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return new api_response_1.ApiError(`Duplicate entry for ${field}`, 409);
    }
    return new api_response_1.ApiError('Database operation failed', 500);
};
exports.handleDatabaseError = handleDatabaseError;
const handleRedisError = (error) => {
    if (error.code === 'ECONNREFUSED') {
        return new api_response_1.ApiError('Cache service unavailable', 503);
    }
    return new api_response_1.ApiError('Cache operation failed', 500);
};
exports.handleRedisError = handleRedisError;
//# sourceMappingURL=error-handler.js.map