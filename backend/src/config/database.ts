import { MongoClient, Db, Collection, Document } from 'mongodb';
import config from './env';
import logger from '../utils/logger';

export class Database {
  private static instance: Database;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      this.client = new MongoClient(config.mongodb.uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db(config.mongodb.dbName);

      // Test the connection
      await this.db.admin().ping();
      logger.info(`Connected to MongoDB: ${config.mongodb.dbName}`);

      // Create indexes
      await this.createIndexes();
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      logger.info('Disconnected from MongoDB');
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  public getCollection<T extends Document = any>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection<T>(name);
  }

  private async createIndexes(): Promise<void> {
    try {
      const db = this.getDb();

      // Users collection indexes
      const usersCollection = db.collection('users');
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      await usersCollection.createIndex({ createdAt: -1 });

      // Expenses collection indexes
      const expensesCollection = db.collection('expenses');
      await expensesCollection.createIndex({ userId: 1 });
      await expensesCollection.createIndex({ userId: 1, createdAt: -1 });
      await expensesCollection.createIndex({ userId: 1, category: 1 });
      await expensesCollection.createIndex({ userId: 1, createdAt: -1, category: 1 });
      await expensesCollection.createIndex({ createdAt: -1 });
      await expensesCollection.createIndex({ category: 1 });

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Error creating database indexes:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<{ status: string; database: string }> {
    try {
      if (!this.db) {
        throw new Error('Database not connected');
      }
      
      await this.db.admin().ping();
      return {
        status: 'connected',
        database: config.mongodb.dbName,
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'disconnected',
        database: config.mongodb.dbName,
      };
    }
  }
}

export default Database.getInstance();