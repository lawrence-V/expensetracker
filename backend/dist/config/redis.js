"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
const redis_1 = require("redis");
const env_1 = __importDefault(require("./env"));
const logger_1 = __importDefault(require("../utils/logger"));
class RedisClient {
    constructor() {
        this.client = null;
    }
    static getInstance() {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }
    async connect() {
        try {
            this.client = (0, redis_1.createClient)({
                socket: {
                    host: env_1.default.redis.host,
                    port: env_1.default.redis.port,
                },
                password: env_1.default.redis.password,
                database: env_1.default.redis.db,
            });
            this.client.on('error', (error) => {
                logger_1.default.error('Redis client error:', error);
            });
            this.client.on('connect', () => {
                logger_1.default.info('Connected to Redis');
            });
            this.client.on('disconnect', () => {
                logger_1.default.warn('Disconnected from Redis');
            });
            await this.client.connect();
        }
        catch (error) {
            logger_1.default.error('Redis connection error:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            this.client = null;
            logger_1.default.info('Disconnected from Redis');
        }
    }
    getClient() {
        if (!this.client) {
            throw new Error('Redis not connected');
        }
        return this.client;
    }
    async set(key, value, ttlSeconds) {
        const client = this.getClient();
        if (ttlSeconds) {
            await client.setEx(key, ttlSeconds, value);
        }
        else {
            await client.set(key, value);
        }
    }
    async get(key) {
        const client = this.getClient();
        return await client.get(key);
    }
    async delete(key) {
        const client = this.getClient();
        await client.del(key);
    }
    async deletePattern(pattern) {
        const client = this.getClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
    }
    async exists(key) {
        const client = this.getClient();
        const result = await client.exists(key);
        return result === 1;
    }
    async setJson(key, value, ttlSeconds) {
        const jsonString = JSON.stringify(value);
        await this.set(key, jsonString, ttlSeconds);
    }
    async getJson(key) {
        const jsonString = await this.get(key);
        if (!jsonString) {
            return null;
        }
        try {
            return JSON.parse(jsonString);
        }
        catch (error) {
            logger_1.default.error(`Error parsing JSON from Redis key ${key}:`, error);
            return null;
        }
    }
    async healthCheck() {
        try {
            if (!this.client) {
                throw new Error('Redis not connected');
            }
            await this.client.ping();
            return {
                status: 'connected',
                host: env_1.default.redis.host,
                port: env_1.default.redis.port,
            };
        }
        catch (error) {
            logger_1.default.error('Redis health check failed:', error);
            return {
                status: 'disconnected',
                host: env_1.default.redis.host,
                port: env_1.default.redis.port,
            };
        }
    }
    static getUserCacheKey(userId) {
        return `user:${userId}`;
    }
    static getExpensesCacheKey(userId, filters) {
        const filterHash = filters ? `:${Buffer.from(filters).toString('base64')}` : '';
        return `expenses:${userId}${filterHash}`;
    }
    static getExpenseSummaryCacheKey(userId, period) {
        const periodKey = period ? `:${period}` : '';
        return `expense_summary:${userId}${periodKey}`;
    }
}
exports.RedisClient = RedisClient;
exports.default = RedisClient.getInstance();
//# sourceMappingURL=redis.js.map