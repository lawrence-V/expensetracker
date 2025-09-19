"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const mongodb_1 = require("mongodb");
const database_1 = __importDefault(require("../config/database"));
const api_response_1 = require("../models/api-response");
const logger_1 = __importDefault(require("../utils/logger"));
class UserRepository {
    constructor() {
        this.collection = null;
    }
    getCollection() {
        if (!this.collection) {
            this.collection = database_1.default.getCollection('users');
        }
        return this.collection;
    }
    static getInstance() {
        if (!UserRepository.instance) {
            UserRepository.instance = new UserRepository();
        }
        return UserRepository.instance;
    }
    async create(userData) {
        try {
            const now = new Date();
            const userDoc = {
                ...userData,
                createdAt: now,
                updatedAt: now,
            };
            const result = await this.getCollection().insertOne(userDoc);
            if (!result.insertedId) {
                throw new api_response_1.ApiError('Failed to create user', 500);
            }
            const createdUser = await this.findById(result.insertedId.toHexString());
            if (!createdUser) {
                throw new api_response_1.ApiError('Failed to retrieve created user', 500);
            }
            logger_1.default.info(`User created successfully: ${createdUser.email}`);
            return createdUser;
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            if (error.code === 11000) {
                logger_1.default.warn(`Duplicate email attempted: ${userData.email}`);
                throw new api_response_1.ApiError('Email already exists', 409);
            }
            logger_1.default.error('Error creating user:', error);
            throw new api_response_1.ApiError('Failed to create user', 500);
        }
    }
    async findById(id) {
        try {
            if (!mongodb_1.ObjectId.isValid(id)) {
                return null;
            }
            const user = await this.getCollection().findOne({ _id: new mongodb_1.ObjectId(id) });
            return user;
        }
        catch (error) {
            logger_1.default.error(`Error finding user by ID ${id}:`, error);
            throw new api_response_1.ApiError('Failed to find user', 500);
        }
    }
    async findByEmail(email) {
        try {
            const user = await this.getCollection().findOne({
                email: { $regex: new RegExp(`^${email}$`, 'i') }
            });
            return user;
        }
        catch (error) {
            logger_1.default.error(`Error finding user by email ${email}:`, error);
            throw new api_response_1.ApiError('Failed to find user', 500);
        }
    }
    async updateById(id, updates) {
        try {
            if (!mongodb_1.ObjectId.isValid(id)) {
                return null;
            }
            const updateDoc = {
                ...updates,
                updatedAt: new Date(),
            };
            const result = await this.getCollection().findOneAndUpdate({ _id: new mongodb_1.ObjectId(id) }, { $set: updateDoc }, { returnDocument: 'after' });
            if (!result) {
                return null;
            }
            logger_1.default.info(`User updated successfully: ${id}`);
            return result;
        }
        catch (error) {
            logger_1.default.error(`Error updating user ${id}:`, error);
            throw new api_response_1.ApiError('Failed to update user', 500);
        }
    }
    async deleteById(id) {
        try {
            if (!mongodb_1.ObjectId.isValid(id)) {
                return false;
            }
            const result = await this.getCollection().deleteOne({ _id: new mongodb_1.ObjectId(id) });
            if (result.deletedCount === 1) {
                logger_1.default.info(`User deleted successfully: ${id}`);
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.default.error(`Error deleting user ${id}:`, error);
            throw new api_response_1.ApiError('Failed to delete user', 500);
        }
    }
    async emailExists(email, excludeId) {
        try {
            const query = {
                email: { $regex: new RegExp(`^${email}$`, 'i') }
            };
            if (excludeId && mongodb_1.ObjectId.isValid(excludeId)) {
                query._id = { $ne: new mongodb_1.ObjectId(excludeId) };
            }
            const user = await this.getCollection().findOne(query, { projection: { _id: 1 } });
            return user !== null;
        }
        catch (error) {
            logger_1.default.error(`Error checking email existence ${email}:`, error);
            throw new api_response_1.ApiError('Failed to check email', 500);
        }
    }
    async count() {
        try {
            return await this.getCollection().countDocuments();
        }
        catch (error) {
            logger_1.default.error('Error counting users:', error);
            throw new api_response_1.ApiError('Failed to count users', 500);
        }
    }
    async findWithPagination(page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
            const [users, total] = await Promise.all([
                this.getCollection()
                    .find({})
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                this.getCollection().countDocuments()
            ]);
            return { users, total };
        }
        catch (error) {
            logger_1.default.error('Error finding users with pagination:', error);
            throw new api_response_1.ApiError('Failed to fetch users', 500);
        }
    }
    async updateLastLogin(id) {
        try {
            if (!mongodb_1.ObjectId.isValid(id)) {
                throw new api_response_1.ApiError('Invalid user ID', 400);
            }
            await this.getCollection().updateOne({ _id: new mongodb_1.ObjectId(id) }, {
                $set: {
                    lastLoginAt: new Date(),
                    updatedAt: new Date()
                }
            });
            logger_1.default.info(`Updated last login for user: ${id}`);
        }
        catch (error) {
            logger_1.default.error(`Error updating last login for user ${id}:`, error);
        }
    }
}
exports.UserRepository = UserRepository;
exports.default = UserRepository.getInstance();
//# sourceMappingURL=user-repository.js.map