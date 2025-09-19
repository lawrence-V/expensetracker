import { createClient, RedisClientType } from 'redis';
import config from './env';
import logger from '../utils/logger';

export class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType | null = null;

  private constructor() {}

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis');
      });

      this.client.on('disconnect', () => {
        logger.warn('Disconnected from Redis');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Redis connection error:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      logger.info('Disconnected from Redis');
    }
  }

  public getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    return this.client;
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = this.getClient();
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  public async delete(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(key);
  }

  public async deletePattern(pattern: string): Promise<void> {
    const client = this.getClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  }

  public async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  public async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const jsonString = JSON.stringify(value);
    await this.set(key, jsonString, ttlSeconds);
  }

  public async getJson<T = any>(key: string): Promise<T | null> {
    const jsonString = await this.get(key);
    if (!jsonString) {
      return null;
    }
    
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      logger.error(`Error parsing JSON from Redis key ${key}:`, error);
      return null;
    }
  }

  public async healthCheck(): Promise<{ status: string; host: string; port: number }> {
    try {
      if (!this.client) {
        throw new Error('Redis not connected');
      }
      
      await this.client.ping();
      return {
        status: 'connected',
        host: config.redis.host,
        port: config.redis.port,
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'disconnected',
        host: config.redis.host,
        port: config.redis.port,
      };
    }
  }

  // Cache key helpers
  public static getUserCacheKey(userId: string): string {
    return `user:${userId}`;
  }

  public static getExpensesCacheKey(userId: string, filters?: string): string {
    const filterHash = filters ? `:${Buffer.from(filters).toString('base64')}` : '';
    return `expenses:${userId}${filterHash}`;
  }

  public static getExpenseSummaryCacheKey(userId: string, period?: string): string {
    const periodKey = period ? `:${period}` : '';
    return `expense_summary:${userId}${periodKey}`;
  }
}

export default RedisClient.getInstance();