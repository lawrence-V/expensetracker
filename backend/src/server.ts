import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/env';
import database from './config/database';
import redisClient from './config/redis';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';

const app = express();

/**
 * Security Middleware
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

/**
 * Rate Limiting
 */
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'Rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

/**
 * Body parsing middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Request logging
 */
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.userId || 'anonymous',
  });
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    const [dbHealth, redisHealth] = await Promise.all([
      database.healthCheck(),
      redisClient.healthCheck(),
    ]);

    res.json({
      success: true,
      message: 'Service is healthy',
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealth,
        redis: redisHealth,
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Service unhealthy',
      error: 'Health check failed',
    });
  }
});

/**
 * API Routes
 */
import apiRoutes from './routes';
app.use('/api', apiRoutes);

/**
 * Welcome endpoint
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Expense Tracker API',
    data: {
      version: '1.0.0',
      documentation: '/api/docs',
      health: '/health',
    },
  });
});

/**
 * Error handling middleware
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Graceful shutdown handling
 */
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connections
    await database.disconnect();
    
    // Close Redis connection
    await redisClient.disconnect();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Connect to databases
    logger.info('Connecting to databases...');
    await Promise.all([
      database.connect(),
      redisClient.connect(),
    ]);

    // Start the HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Expense Tracker API is running on port ${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🗄️ Database: Connected to MongoDB`);
      logger.info(`🔄 Cache: Connected to Redis`);
      logger.info(`📝 Logs: Writing to ${config.logging.file}`);
      
      if (config.nodeEnv === 'development') {
        logger.info(`🔗 Health Check: http://localhost:${config.port}/health`);
        logger.info(`📋 API Base URL: http://localhost:${config.port}/api`);
      }
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;