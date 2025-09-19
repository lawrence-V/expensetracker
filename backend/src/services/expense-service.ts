import expenseRepository from '../repositories/expense-repository';
import redisClient, { RedisClient } from '../config/redis';
import { 
  CreateExpenseDto, 
  UpdateExpenseDto, 
  ExpenseResponse, 
  ExpenseFilter,
  ExpenseSummary,
  ExpenseQueryParams,
  transformExpenseToResponse 
} from '../models/expense';
import { ApiError, createPaginatedResponse } from '../models/api-response';
import { DateHelpers } from '../utils/date-helpers';
import { ObjectId } from 'mongodb';
import logger from '../utils/logger';

const EXPENSE_CACHE_TTL = 1800; // 30 minutes
const SUMMARY_CACHE_TTL = 3600; // 1 hour

export class ExpenseService {
  private static instance: ExpenseService;

  private constructor() {}

  public static getInstance(): ExpenseService {
    if (!ExpenseService.instance) {
      ExpenseService.instance = new ExpenseService();
    }
    return ExpenseService.instance;
  }

  /**
   * Create a new expense
   * @param userId - User ID
   * @param expenseData - Expense data
   * @returns Promise<ExpenseResponse> - Created expense
   */
  public async createExpense(userId: string, expenseData: CreateExpenseDto): Promise<ExpenseResponse> {
    try {
      const expense = await expenseRepository.create(userId, expenseData);
      const expenseResponse = transformExpenseToResponse(expense);

      // Invalidate related caches
      await this.invalidateUserCaches(userId);

      logger.info(`Expense created: ${expense._id} for user ${userId}`);
      return expenseResponse;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error creating expense:', error);
      throw new ApiError('Failed to create expense', 500);
    }
  }

  /**
   * Get expenses with filters and pagination
   * @param userId - User ID
   * @param queryParams - Query parameters
   * @returns Promise<PaginatedResponse> - Paginated expenses
   */
  public async getExpenses(
    userId: string,
    queryParams: ExpenseQueryParams
  ): Promise<{ expenses: ExpenseResponse[]; total: number; page: number; limit: number }> {
    try {
      const page = parseInt(queryParams.page || '1');
      const limit = parseInt(queryParams.limit || '20');
      const offset = (page - 1) * limit;

      // Build date filter
      let dateRange: { startDate?: Date; endDate?: Date } | null = null;
      if (queryParams.period) {
        dateRange = DateHelpers.getDateRange(
          queryParams.period,
          queryParams.startDate,
          queryParams.endDate
        );
      }

      const filters: ExpenseFilter = {
        userId: new ObjectId(userId),
        startDate: dateRange?.startDate,
        endDate: dateRange?.endDate,
        category: queryParams.category as any,
        limit,
        offset,
      };

      // Check cache first
      const cacheKey = this.getExpensesCacheKey(userId, filters);
      const cachedResult = await this.getCachedExpenses(cacheKey);
      if (cachedResult) {
        logger.info(`Cache hit for expenses: user ${userId}`);
        return cachedResult;
      }

      // Get from database
      const { expenses, total } = await expenseRepository.findWithFilters(filters);
      const expenseResponses = expenses.map(transformExpenseToResponse);

      const result = {
        expenses: expenseResponses,
        total,
        page,
        limit,
      };

      // Cache the result
      await this.cacheExpenses(cacheKey, result);

      return result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Error getting expenses for user ${userId}:`, error);
      throw new ApiError('Failed to get expenses', 500);
    }
  }

  /**
   * Get expense by ID
   * @param expenseId - Expense ID
   * @param userId - User ID
   * @returns Promise<ExpenseResponse> - Expense
   */
  public async getExpenseById(expenseId: string, userId: string): Promise<ExpenseResponse> {
    try {
      const expense = await expenseRepository.findByIdAndUserId(expenseId, userId);
      if (!expense) {
        throw new ApiError('Expense not found', 404);
      }

      return transformExpenseToResponse(expense);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Error getting expense ${expenseId} for user ${userId}:`, error);
      throw new ApiError('Failed to get expense', 500);
    }
  }

  /**
   * Update expense
   * @param expenseId - Expense ID
   * @param userId - User ID
   * @param updates - Update data
   * @returns Promise<ExpenseResponse> - Updated expense
   */
  public async updateExpense(
    expenseId: string,
    userId: string,
    updates: UpdateExpenseDto
  ): Promise<ExpenseResponse> {
    try {
      const updatedExpense = await expenseRepository.updateByIdAndUserId(expenseId, userId, updates);
      if (!updatedExpense) {
        throw new ApiError('Expense not found', 404);
      }

      // Invalidate related caches
      await this.invalidateUserCaches(userId);

      logger.info(`Expense updated: ${expenseId} for user ${userId}`);
      return transformExpenseToResponse(updatedExpense);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Error updating expense ${expenseId} for user ${userId}:`, error);
      throw new ApiError('Failed to update expense', 500);
    }
  }

  /**
   * Delete expense
   * @param expenseId - Expense ID
   * @param userId - User ID
   * @returns Promise<void>
   */
  public async deleteExpense(expenseId: string, userId: string): Promise<void> {
    try {
      const deleted = await expenseRepository.deleteByIdAndUserId(expenseId, userId);
      if (!deleted) {
        throw new ApiError('Expense not found', 404);
      }

      // Invalidate related caches
      await this.invalidateUserCaches(userId);

      logger.info(`Expense deleted: ${expenseId} for user ${userId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Error deleting expense ${expenseId} for user ${userId}:`, error);
      throw new ApiError('Failed to delete expense', 500);
    }
  }

  /**
   * Get expense summary
   * @param userId - User ID
   * @param queryParams - Query parameters for date filtering
   * @returns Promise<ExpenseSummary> - Expense summary
   */
  public async getExpenseSummary(
    userId: string,
    queryParams: { period?: string; startDate?: string; endDate?: string }
  ): Promise<ExpenseSummary> {
    try {
      // Build date filter
      let dateRange: { startDate?: Date; endDate?: Date } | null = null;
      if (queryParams.period) {
        dateRange = DateHelpers.getDateRange(
          queryParams.period as any,
          queryParams.startDate,
          queryParams.endDate
        );
      }

      // Check cache first
      const cacheKey = RedisClient.getExpenseSummaryCacheKey(userId, queryParams.period);
      const cachedSummary = await this.getCachedSummary(cacheKey);
      if (cachedSummary) {
        logger.info(`Cache hit for expense summary: user ${userId}`);
        return cachedSummary;
      }

      // Get from database
      const summary = await expenseRepository.getSummary(
        userId,
        dateRange?.startDate,
        dateRange?.endDate
      );

      // Cache the result
      await this.cacheSummary(cacheKey, summary);

      return summary;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Error getting expense summary for user ${userId}:`, error);
      throw new ApiError('Failed to get expense summary', 500);
    }
  }

  /**
   * Get recent expenses
   * @param userId - User ID
   * @param limit - Number of expenses to fetch
   * @returns Promise<ExpenseResponse[]> - Recent expenses
   */
  public async getRecentExpenses(userId: string, limit: number = 10): Promise<ExpenseResponse[]> {
    try {
      const expenses = await expenseRepository.getRecentByUserId(userId, limit);
      return expenses.map(transformExpenseToResponse);
    } catch (error) {
      logger.error(`Error getting recent expenses for user ${userId}:`, error);
      throw new ApiError('Failed to get recent expenses', 500);
    }
  }

  /**
   * Generate cache key for expenses
   */
  private getExpensesCacheKey(userId: string, filters: ExpenseFilter): string {
    const filterString = JSON.stringify({
      startDate: filters.startDate,
      endDate: filters.endDate,
      category: filters.category,
      limit: filters.limit,
      offset: filters.offset,
    });
    return RedisClient.getExpensesCacheKey(userId, filterString);
  }

  /**
   * Cache expenses result
   */
  private async cacheExpenses(
    cacheKey: string,
    data: { expenses: ExpenseResponse[]; total: number; page: number; limit: number }
  ): Promise<void> {
    try {
      await redisClient.setJson(cacheKey, data, EXPENSE_CACHE_TTL);
    } catch (error) {
      logger.warn('Failed to cache expenses:', error);
    }
  }

  /**
   * Get cached expenses
   */
  private async getCachedExpenses(
    cacheKey: string
  ): Promise<{ expenses: ExpenseResponse[]; total: number; page: number; limit: number } | null> {
    try {
      return await redisClient.getJson(cacheKey);
    } catch (error) {
      logger.warn('Failed to get cached expenses:', error);
      return null;
    }
  }

  /**
   * Cache expense summary
   */
  private async cacheSummary(cacheKey: string, summary: ExpenseSummary): Promise<void> {
    try {
      await redisClient.setJson(cacheKey, summary, SUMMARY_CACHE_TTL);
    } catch (error) {
      logger.warn('Failed to cache expense summary:', error);
    }
  }

  /**
   * Get cached expense summary
   */
  private async getCachedSummary(cacheKey: string): Promise<ExpenseSummary | null> {
    try {
      return await redisClient.getJson<ExpenseSummary>(cacheKey);
    } catch (error) {
      logger.warn('Failed to get cached expense summary:', error);
      return null;
    }
  }

  /**
   * Invalidate all caches for a user
   */
  private async invalidateUserCaches(userId: string): Promise<void> {
    try {
      await Promise.all([
        redisClient.deletePattern(`expenses:${userId}*`),
        redisClient.deletePattern(`expense_summary:${userId}*`),
      ]);
    } catch (error) {
      logger.warn(`Failed to invalidate caches for user ${userId}:`, error);
    }
  }
}

export default ExpenseService.getInstance();