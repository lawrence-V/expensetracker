"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = __importDefault(require("./config/env"));
const database_1 = __importDefault(require("./config/database"));
const redis_1 = __importDefault(require("./config/redis"));
const logger_1 = __importDefault(require("./utils/logger"));
const error_handler_1 = require("./middlewares/error-handler");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: env_1.default.rateLimit.windowMs,
    max: env_1.default.rateLimit.maxRequests,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        error: 'Rate limit exceeded'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
    logger_1.default.info(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId || 'anonymous',
    });
    next();
});
app.get('/health', async (req, res) => {
    try {
        const [dbHealth, redisHealth] = await Promise.all([
            database_1.default.healthCheck(),
            redis_1.default.healthCheck(),
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
    }
    catch (error) {
        logger_1.default.error('Health check failed:', error);
        res.status(503).json({
            success: false,
            message: 'Service unhealthy',
            error: 'Health check failed',
        });
    }
});
const routes_1 = __importDefault(require("./routes"));
app.use('/api', routes_1.default);
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
app.use(error_handler_1.notFoundHandler);
app.use(error_handler_1.errorHandler);
const gracefulShutdown = async (signal) => {
    logger_1.default.info(`Received ${signal}. Starting graceful shutdown...`);
    try {
        await database_1.default.disconnect();
        await redis_1.default.disconnect();
        logger_1.default.info('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
const startServer = async () => {
    try {
        logger_1.default.info('Connecting to databases...');
        await Promise.all([
            database_1.default.connect(),
            redis_1.default.connect(),
        ]);
        const server = app.listen(env_1.default.port, () => {
            logger_1.default.info(`🚀 Expense Tracker API is running on port ${env_1.default.port}`);
            logger_1.default.info(`📊 Environment: ${env_1.default.nodeEnv}`);
            logger_1.default.info(`🗄️ Database: Connected to MongoDB`);
            logger_1.default.info(`🔄 Cache: Connected to Redis`);
            logger_1.default.info(`📝 Logs: Writing to ${env_1.default.logging.file}`);
            if (env_1.default.nodeEnv === 'development') {
                logger_1.default.info(`🔗 Health Check: http://localhost:${env_1.default.port}/health`);
                logger_1.default.info(`📋 API Base URL: http://localhost:${env_1.default.port}/api`);
            }
        });
        server.on('error', (error) => {
            logger_1.default.error('Server error:', error);
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map