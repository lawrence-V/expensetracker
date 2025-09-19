"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const mongodb_1 = require("mongodb");
const env_1 = __importDefault(require("./env"));
const logger_1 = __importDefault(require("../utils/logger"));
class Database {
    constructor() {
        this.client = null;
        this.db = null;
    }
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    async connect() {
        try {
            this.client = new mongodb_1.MongoClient(env_1.default.mongodb.uri, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            await this.client.connect();
            this.db = this.client.db(env_1.default.mongodb.dbName);
            await this.db.admin().ping();
            logger_1.default.info(`Connected to MongoDB: ${env_1.default.mongodb.dbName}`);
            await this.createIndexes();
        }
        catch (error) {
            logger_1.default.error('MongoDB connection error:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            logger_1.default.info('Disconnected from MongoDB');
        }
    }
    getDb() {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        return this.db;
    }
    getCollection(name) {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        return this.db.collection(name);
    }
    async createIndexes() {
        try {
            const db = this.getDb();
            const usersCollection = db.collection('users');
            await usersCollection.createIndex({ email: 1 }, { unique: true });
            await usersCollection.createIndex({ createdAt: -1 });
            const expensesCollection = db.collection('expenses');
            await expensesCollection.createIndex({ userId: 1 });
            await expensesCollection.createIndex({ userId: 1, createdAt: -1 });
            await expensesCollection.createIndex({ userId: 1, category: 1 });
            await expensesCollection.createIndex({ userId: 1, createdAt: -1, category: 1 });
            await expensesCollection.createIndex({ createdAt: -1 });
            await expensesCollection.createIndex({ category: 1 });
            logger_1.default.info('Database indexes created successfully');
        }
        catch (error) {
            logger_1.default.error('Error creating database indexes:', error);
            throw error;
        }
    }
    async healthCheck() {
        try {
            if (!this.db) {
                throw new Error('Database not connected');
            }
            await this.db.admin().ping();
            return {
                status: 'connected',
                database: env_1.default.mongodb.dbName,
            };
        }
        catch (error) {
            logger_1.default.error('Database health check failed:', error);
            return {
                status: 'disconnected',
                database: env_1.default.mongodb.dbName,
            };
        }
    }
}
exports.Database = Database;
exports.default = Database.getInstance();
//# sourceMappingURL=database.js.map