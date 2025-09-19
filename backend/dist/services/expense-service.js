"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseService = void 0;
const expense_repository_1 = __importDefault(require("../repositories/expense-repository"));
const redis_1 = __importStar(require("../config/redis"));
const expense_1 = require("../models/expense");
const api_response_1 = require("../models/api-response");
const date_helpers_1 = require("../utils/date-helpers");
const mongodb_1 = require("mongodb");
const logger_1 = __importDefault(require("../utils/logger"));
const EXPENSE_CACHE_TTL = 1800;
const SUMMARY_CACHE_TTL = 3600;
class ExpenseService {
    constructor() { }
    static getInstance() {
        if (!ExpenseService.instance) {
            ExpenseService.instance = new ExpenseService();
        }
        return ExpenseService.instance;
    }
    async createExpense(userId, expenseData) {
        try {
            const expense = await expense_repository_1.default.create(userId, expenseData);
            const expenseResponse = (0, expense_1.transformExpenseToResponse)(expense);
            await this.invalidateUserCaches(userId);
            logger_1.default.info(`Expense created: ${expense._id} for user ${userId}`);
            return expenseResponse;
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error('Error creating expense:', error);
            throw new api_response_1.ApiError('Failed to create expense', 500);
        }
    }
    async getExpenses(userId, queryParams) {
        try {
            const page = parseInt(queryParams.page || '1');
            const limit = parseInt(queryParams.limit || '20');
            const offset = (page - 1) * limit;
            let dateRange = null;
            if (queryParams.period) {
                dateRange = date_helpers_1.DateHelpers.getDateRange(queryParams.period, queryParams.startDate, queryParams.endDate);
            }
            const filters = {
                userId: new mongodb_1.ObjectId(userId),
                startDate: dateRange?.startDate,
                endDate: dateRange?.endDate,
                category: queryParams.category,
                limit,
                offset,
            };
            const cacheKey = this.getExpensesCacheKey(userId, filters);
            const cachedResult = await this.getCachedExpenses(cacheKey);
            if (cachedResult) {
                logger_1.default.info(`Cache hit for expenses: user ${userId}`);
                return cachedResult;
            }
            const { expenses, total } = await expense_repository_1.default.findWithFilters(filters);
            const expenseResponses = expenses.map(expense_1.transformExpenseToResponse);
            const result = {
                expenses: expenseResponses,
                total,
                page,
                limit,
            };
            await this.cacheExpenses(cacheKey, result);
            return result;
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error(`Error getting expenses for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to get expenses', 500);
        }
    }
    async getExpenseById(expenseId, userId) {
        try {
            const expense = await expense_repository_1.default.findByIdAndUserId(expenseId, userId);
            if (!expense) {
                throw new api_response_1.ApiError('Expense not found', 404);
            }
            return (0, expense_1.transformExpenseToResponse)(expense);
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error(`Error getting expense ${expenseId} for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to get expense', 500);
        }
    }
    async updateExpense(expenseId, userId, updates) {
        try {
            const updatedExpense = await expense_repository_1.default.updateByIdAndUserId(expenseId, userId, updates);
            if (!updatedExpense) {
                throw new api_response_1.ApiError('Expense not found', 404);
            }
            await this.invalidateUserCaches(userId);
            logger_1.default.info(`Expense updated: ${expenseId} for user ${userId}`);
            return (0, expense_1.transformExpenseToResponse)(updatedExpense);
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error(`Error updating expense ${expenseId} for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to update expense', 500);
        }
    }
    async deleteExpense(expenseId, userId) {
        try {
            const deleted = await expense_repository_1.default.deleteByIdAndUserId(expenseId, userId);
            if (!deleted) {
                throw new api_response_1.ApiError('Expense not found', 404);
            }
            await this.invalidateUserCaches(userId);
            logger_1.default.info(`Expense deleted: ${expenseId} for user ${userId}`);
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error(`Error deleting expense ${expenseId} for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to delete expense', 500);
        }
    }
    async getExpenseSummary(userId, queryParams) {
        try {
            let dateRange = null;
            if (queryParams.period) {
                dateRange = date_helpers_1.DateHelpers.getDateRange(queryParams.period, queryParams.startDate, queryParams.endDate);
            }
            const cacheKey = redis_1.RedisClient.getExpenseSummaryCacheKey(userId, queryParams.period);
            const cachedSummary = await this.getCachedSummary(cacheKey);
            if (cachedSummary) {
                logger_1.default.info(`Cache hit for expense summary: user ${userId}`);
                return cachedSummary;
            }
            const summary = await expense_repository_1.default.getSummary(userId, dateRange?.startDate, dateRange?.endDate);
            await this.cacheSummary(cacheKey, summary);
            return summary;
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error(`Error getting expense summary for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to get expense summary', 500);
        }
    }
    async getRecentExpenses(userId, limit = 10) {
        try {
            const expenses = await expense_repository_1.default.getRecentByUserId(userId, limit);
            return expenses.map(expense_1.transformExpenseToResponse);
        }
        catch (error) {
            logger_1.default.error(`Error getting recent expenses for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to get recent expenses', 500);
        }
    }
    getExpensesCacheKey(userId, filters) {
        const filterString = JSON.stringify({
            startDate: filters.startDate,
            endDate: filters.endDate,
            category: filters.category,
            limit: filters.limit,
            offset: filters.offset,
        });
        return redis_1.RedisClient.getExpensesCacheKey(userId, filterString);
    }
    async cacheExpenses(cacheKey, data) {
        try {
            await redis_1.default.setJson(cacheKey, data, EXPENSE_CACHE_TTL);
        }
        catch (error) {
            logger_1.default.warn('Failed to cache expenses:', error);
        }
    }
    async getCachedExpenses(cacheKey) {
        try {
            return await redis_1.default.getJson(cacheKey);
        }
        catch (error) {
            logger_1.default.warn('Failed to get cached expenses:', error);
            return null;
        }
    }
    async cacheSummary(cacheKey, summary) {
        try {
            await redis_1.default.setJson(cacheKey, summary, SUMMARY_CACHE_TTL);
        }
        catch (error) {
            logger_1.default.warn('Failed to cache expense summary:', error);
        }
    }
    async getCachedSummary(cacheKey) {
        try {
            return await redis_1.default.getJson(cacheKey);
        }
        catch (error) {
            logger_1.default.warn('Failed to get cached expense summary:', error);
            return null;
        }
    }
    async invalidateUserCaches(userId) {
        try {
            await Promise.all([
                redis_1.default.deletePattern(`expenses:${userId}*`),
                redis_1.default.deletePattern(`expense_summary:${userId}*`),
            ]);
        }
        catch (error) {
            logger_1.default.warn(`Failed to invalidate caches for user ${userId}:`, error);
        }
    }
}
exports.ExpenseService = ExpenseService;
exports.default = ExpenseService.getInstance();
//# sourceMappingURL=expense-service.js.map