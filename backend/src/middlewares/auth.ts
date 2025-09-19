import { Request, Response, NextFunction } from 'express';
import { JwtUtils } from '../utils/jwt';
import { ApiError, createErrorResponse } from '../models/api-response';
import { JwtPayload } from '../models/user';
import logger from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user info to request
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      const errorResponse = createErrorResponse('Access token required', 'No authorization header provided', 401);
      res.status(401).json(errorResponse);
      return;
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      const errorResponse = createErrorResponse('Access token required', 'No token provided', 401);
      res.status(401).json(errorResponse);
      return;
    }

    const decoded = JwtUtils.verifyAccessToken(token);
    req.user = decoded;
    
    logger.info(`User ${decoded.userId} authenticated successfully`);
    next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    
    if (error instanceof ApiError) {
      const errorResponse = createErrorResponse(error.message, error.message, error.statusCode);
      res.status(error.statusCode).json(errorResponse);
    } else {
      const errorResponse = createErrorResponse('Authentication failed', 'Invalid token', 401);
      res.status(401).json(errorResponse);
    }
  }
};

/**
 * Optional JWT Authentication Middleware
 * Validates JWT token if present but doesn't require it
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
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
      const decoded = JwtUtils.verifyAccessToken(token);
      req.user = decoded;
      logger.info(`User ${decoded.userId} authenticated successfully (optional)`);
    } catch (error) {
      // Log the error but don't block the request
      logger.warn('Optional authentication failed:', error);
    }
    
    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};

/**
 * Middleware to check if user is authenticated
 * Use this after authenticateToken to ensure user is set
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    const errorResponse = createErrorResponse('Authentication required', 'User not authenticated', 401);
    res.status(401).json(errorResponse);
    return;
  }
  
  next();
};

/**
 * Middleware to validate refresh token
 */
export const validateRefreshToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      const errorResponse = createErrorResponse('Refresh token required', 'No refresh token provided', 400);
      res.status(400).json(errorResponse);
      return;
    }

    const decoded = JwtUtils.verifyRefreshToken(refreshToken);
    req.user = decoded;
    
    logger.info(`Refresh token validated for user ${decoded.userId}`);
    next();
  } catch (error) {
    logger.error('Refresh token validation failed:', error);
    
    if (error instanceof ApiError) {
      const errorResponse = createErrorResponse(error.message, error.message, error.statusCode);
      res.status(error.statusCode).json(errorResponse);
    } else {
      const errorResponse = createErrorResponse('Invalid refresh token', 'Refresh token validation failed', 401);
      res.status(401).json(errorResponse);
    }
  }
};

/**
 * Middleware to check if authenticated user owns the resource
 * Compares req.user.userId with req.params.userId or req.body.userId
 */
export const checkResourceOwnership = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      const errorResponse = createErrorResponse('Authentication required', 'User not authenticated', 401);
      res.status(401).json(errorResponse);
      return;
    }

    const currentUserId = req.user.userId;
    const resourceUserId = req.params.userId || req.body.userId;

    if (resourceUserId && currentUserId !== resourceUserId) {
      const errorResponse = createErrorResponse('Access denied', 'You can only access your own resources', 403);
      res.status(403).json(errorResponse);
      return;
    }

    next();
  } catch (error) {
    logger.error('Resource ownership check failed:', error);
    const errorResponse = createErrorResponse('Access control error', 'Failed to verify resource ownership', 500);
    res.status(500).json(errorResponse);
  }
};