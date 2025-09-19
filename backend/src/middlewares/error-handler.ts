import { Request, Response, NextFunction } from 'express';
import { ApiError, createErrorResponse } from '../models/api-response';
import logger from '../utils/logger';
import config from '../config/env';

/**
 * Global error handling middleware
 * Must be the last middleware in the chain
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error('Error caught by global handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId || 'anonymous',
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorDetails = 'Something went wrong';

  // Handle specific error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorDetails = err.message;
  } else if (err.name === 'ValidationError') {
    // Joi validation errors (shouldn't reach here if validation middleware is working)
    statusCode = 400;
    message = 'Validation Error';
    errorDetails = err.message;
  } else if (err.name === 'MongoServerError') {
    // MongoDB specific errors
    const mongoError = err as any;
    
    if (mongoError.code === 11000) {
      // Duplicate key error
      const field = Object.keys(mongoError.keyPattern)[0];
      statusCode = 409;
      message = 'Duplicate Entry';
      errorDetails = `${field} already exists`;
    } else {
      statusCode = 500;
      message = 'Database Error';
      errorDetails = 'A database error occurred';
    }
  } else if (err.name === 'CastError') {
    // Invalid ObjectId or type casting error
    statusCode = 400;
    message = 'Invalid ID Format';
    errorDetails = 'The provided ID is not valid';
  } else if (err.name === 'JsonWebTokenError') {
    // JWT errors (shouldn't reach here if auth middleware is working)
    statusCode = 401;
    message = 'Invalid Token';
    errorDetails = 'Authentication token is invalid';
  } else if (err.name === 'TokenExpiredError') {
    // Expired JWT token
    statusCode = 401;
    message = 'Token Expired';
    errorDetails = 'Authentication token has expired';
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // JSON parsing error
    statusCode = 400;
    message = 'Invalid JSON';
    errorDetails = 'Request body contains invalid JSON';
  }

  // Create error response
  const errorResponse = createErrorResponse(
    message,
    config.nodeEnv === 'development' ? err.stack || errorDetails : errorDetails,
    statusCode
  );

  // Add request path to error response
  errorResponse.path = req.originalUrl;

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Should be placed before the global error handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const errorResponse = createErrorResponse(
    'Not Found',
    `The endpoint ${req.originalUrl} does not exist`,
    404
  );
  
  errorResponse.path = req.originalUrl;
  
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId || 'anonymous',
  });

  res.status(404).json(errorResponse);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch rejected promises
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Database connection error handler
 */
export const handleDatabaseError = (error: any): ApiError => {
  if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
    return new ApiError('Database connection failed', 503);
  }
  
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return new ApiError(`Duplicate entry for ${field}`, 409);
  }
  
  return new ApiError('Database operation failed', 500);
};

/**
 * Redis connection error handler
 */
export const handleRedisError = (error: any): ApiError => {
  if (error.code === 'ECONNREFUSED') {
    return new ApiError('Cache service unavailable', 503);
  }
  
  return new ApiError('Cache operation failed', 500);
};