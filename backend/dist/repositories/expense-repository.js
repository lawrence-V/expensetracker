"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseRepository = void 0;
const mongodb_1 = require("mongodb");
const database_1 = __importDefault(require("../config/database"));
const api_response_1 = require("../models/api-response");
const logger_1 = __importDefault(require("../utils/logger"));
class ExpenseRepository {
    constructor() {
        this.collection = null;
    }
    getCollection() {
        if (!this.collection) {
            this.collection = database_1.default.getCollection('expenses');
        }
        return this.collection;
    }
    static getInstance() {
        if (!ExpenseRepository.instance) {
            ExpenseRepository.instance = new ExpenseRepository();
        }
        return ExpenseRepository.instance;
    }
    async create(userId, expenseData) {
        try {
            if (!mongodb_1.ObjectId.isValid(userId)) {
                throw new api_response_1.ApiError('Invalid user ID', 400);
            }
            const now = new Date();
            const expenseDoc = {
                ...expenseData,
                userId: new mongodb_1.ObjectId(userId),
                createdAt: now,
                updatedAt: now,
            };
            const result = await this.getCollection().insertOne(expenseDoc);
            if (!result.insertedId) {
                throw new api_response_1.ApiError('Failed to create expense', 500);
            }
            const createdExpense = await this.findById(result.insertedId.toHexString());
            if (!createdExpense) {
                throw new api_response_1.ApiError('Failed to retrieve created expense', 500);
            }
            logger_1.default.info(`Expense created successfully: ${createdExpense._id} for user ${userId}`);
            return createdExpense;
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error('Error creating expense:', error);
            throw new api_response_1.ApiError('Failed to create expense', 500);
        }
    }
    async findById(id) {
        try {
            if (!mongodb_1.ObjectId.isValid(id)) {
                return null;
            }
            const expense = await this.getCollection().findOne({ _id: new mongodb_1.ObjectId(id) });
            return expense;
        }
        catch (error) {
            logger_1.default.error(`Error finding expense by ID ${id}:`, error);
            throw new api_response_1.ApiError('Failed to find expense', 500);
        }
    }
    async findByIdAndUserId(id, userId) {
        try {
            if (!mongodb_1.ObjectId.isValid(id) || !mongodb_1.ObjectId.isValid(userId)) {
                return null;
            }
            const expense = await this.getCollection().findOne({
                _id: new mongodb_1.ObjectId(id),
                userId: new mongodb_1.ObjectId(userId)
            });
            return expense;
        }
        catch (error) {
            logger_1.default.error(`Error finding expense by ID ${id} and user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to find expense', 500);
        }
    }
    async findWithFilters(filters) {
        try {
            const query = { userId: filters.userId };
            if (filters.startDate || filters.endDate) {
                query.createdAt = {};
                if (filters.startDate) {
                    query.createdAt.$gte = filters.startDate;
                }
                if (filters.endDate) {
                    query.createdAt.$lte = filters.endDate;
                }
            }
            if (filters.category) {
                query.category = filters.category;
            }
            const limit = filters.limit || 20;
            const offset = filters.offset || 0;
            const [expenses, total] = await Promise.all([
                this.getCollection()
                    .find(query)
                    .sort({ createdAt: -1 })
                    .skip(offset)
                    .limit(limit)
                    .toArray(),
                this.getCollection().countDocuments(query)
            ]);
            return { expenses, total };
        }
        catch (error) {
            logger_1.default.error('Error finding expenses with filters:', error);
            throw new api_response_1.ApiError('Failed to fetch expenses', 500);
        }
    }
    async updateByIdAndUserId(id, userId, updates) {
        try {
            if (!mongodb_1.ObjectId.isValid(id) || !mongodb_1.ObjectId.isValid(userId)) {
                return null;
            }
            const updateDoc = {
                ...updates,
                updatedAt: new Date(),
            };
            const result = await this.getCollection().findOneAndUpdate({
                _id: new mongodb_1.ObjectId(id),
                userId: new mongodb_1.ObjectId(userId)
            }, { $set: updateDoc }, { returnDocument: 'after' });
            if (result) {
                logger_1.default.info(`Expense updated successfully: ${id} for user ${userId}`);
            }
            return result;
        }
        catch (error) {
            logger_1.default.error(`Error updating expense ${id} for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to update expense', 500);
        }
    }
    async deleteByIdAndUserId(id, userId) {
        try {
            if (!mongodb_1.ObjectId.isValid(id) || !mongodb_1.ObjectId.isValid(userId)) {
                return false;
            }
            const result = await this.getCollection().deleteOne({
                _id: new mongodb_1.ObjectId(id),
                userId: new mongodb_1.ObjectId(userId)
            });
            if (result.deletedCount === 1) {
                logger_1.default.info(`Expense deleted successfully: ${id} for user ${userId}`);
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.default.error(`Error deleting expense ${id} for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to delete expense', 500);
        }
    }
    async getSummary(userId, startDate, endDate) {
        try {
            if (!mongodb_1.ObjectId.isValid(userId)) {
                throw new api_response_1.ApiError('Invalid user ID', 400);
            }
            const matchStage = { userId: new mongodb_1.ObjectId(userId) };
            if (startDate || endDate) {
                matchStage.createdAt = {};
                if (startDate) {
                    matchStage.createdAt.$gte = startDate;
                }
                if (endDate) {
                    matchStage.createdAt.$lte = endDate;
                }
            }
            const pipeline = [
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$amount' },
                        totalCount: { $sum: 1 },
                        categories: {
                            $push: {
                                category: '$category',
                                amount: '$amount'
                            }
                        }
                    }
                },
                {
                    $unwind: '$categories'
                },
                {
                    $group: {
                        _id: {
                            totalAmount: '$totalAmount',
                            totalCount: '$totalCount'
                        },
                        categoryBreakdown: {
                            $push: {
                                category: '$categories.category',
                                amount: '$categories.amount'
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalAmount: '$_id.totalAmount',
                        totalCount: '$_id.totalCount',
                        categoryBreakdown: {
                            $map: {
                                input: {
                                    $setUnion: ['$categoryBreakdown.category']
                                },
                                as: 'category',
                                in: {
                                    category: '$$category',
                                    amount: {
                                        $sum: {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: '$categoryBreakdown',
                                                        cond: { $eq: ['$$this.category', '$$category'] }
                                                    }
                                                },
                                                as: 'item',
                                                in: '$$item.amount'
                                            }
                                        }
                                    },
                                    count: {
                                        $size: {
                                            $filter: {
                                                input: '$categoryBreakdown',
                                                cond: { $eq: ['$$this.category', '$$category'] }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ];
            const result = await this.getCollection().aggregate(pipeline).toArray();
            if (result.length === 0) {
                return {
                    totalAmount: 0,
                    totalCount: 0,
                    categoryBreakdown: []
                };
            }
            return result[0];
        }
        catch (error) {
            logger_1.default.error(`Error getting expense summary for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to get expense summary', 500);
        }
    }
    async countByUserId(userId) {
        try {
            if (!mongodb_1.ObjectId.isValid(userId)) {
                throw new api_response_1.ApiError('Invalid user ID', 400);
            }
            return await this.getCollection().countDocuments({ userId: new mongodb_1.ObjectId(userId) });
        }
        catch (error) {
            logger_1.default.error(`Error counting expenses for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to count expenses', 500);
        }
    }
    async deleteAllByUserId(userId) {
        try {
            if (!mongodb_1.ObjectId.isValid(userId)) {
                return 0;
            }
            const result = await this.getCollection().deleteMany({ userId: new mongodb_1.ObjectId(userId) });
            if (result.deletedCount > 0) {
                logger_1.default.info(`Deleted ${result.deletedCount} expenses for user ${userId}`);
            }
            return result.deletedCount;
        }
        catch (error) {
            logger_1.default.error(`Error deleting all expenses for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to delete expenses', 500);
        }
    }
    async getRecentByUserId(userId, limit = 10) {
        try {
            if (!mongodb_1.ObjectId.isValid(userId)) {
                throw new api_response_1.ApiError('Invalid user ID', 400);
            }
            const expenses = await this.getCollection()
                .find({ userId: new mongodb_1.ObjectId(userId) })
                .sort({ createdAt: -1 })
                .limit(limit)
                .toArray();
            return expenses;
        }
        catch (error) {
            logger_1.default.error(`Error getting recent expenses for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to get recent expenses', 500);
        }
    }
}
exports.ExpenseRepository = ExpenseRepository;
exports.default = ExpenseRepository.getInstance();
//# sourceMappingURL=expense-repository.js.map