import { ObjectId, Collection } from 'mongodb';
import database from '../config/database';
import { 
  Expense, 
  CreateExpenseDto, 
  UpdateExpenseDto, 
  ExpenseFilter,
  ExpenseSummary
} from '../models/expense';
import { ExpenseCategory } from '../models/expense-category';
import { ApiError } from '../models/api-response';
import logger from '../utils/logger';

export class ExpenseRepository {
  private static instance: ExpenseRepository;
  private collection: Collection<Expense> | null = null;

  private constructor() {}

  private getCollection(): Collection<Expense> {
    if (!this.collection) {
      this.collection = database.getCollection<Expense>('expenses');
    }
    return this.collection;
  }

  public static getInstance(): ExpenseRepository {
    if (!ExpenseRepository.instance) {
      ExpenseRepository.instance = new ExpenseRepository();
    }
    return ExpenseRepository.instance;
  }

  /**
   * Create a new expense
   * @param userId - User ID
   * @param expenseData - Expense data
   * @returns Promise<Expense> - Created expense
   */
  public async create(userId: string, expenseData: CreateExpenseDto): Promise<Expense> {
    try {
      if (!ObjectId.isValid(userId)) {
        throw new ApiError('Invalid user ID', 400);
      }

      const now = new Date();
      const expenseDoc: Omit<Expense, '_id'> = {
        ...expenseData,
        userId: new ObjectId(userId),
        createdAt: now,
        updatedAt: now,
      };

      const result = await this.getCollection().insertOne(expenseDoc as Expense);
      
      if (!result.insertedId) {
        throw new ApiError('Failed to create expense', 500);
      }

      const createdExpense = await this.findById(result.insertedId.toHexString());
      if (!createdExpense) {
        throw new ApiError('Failed to retrieve created expense', 500);
      }

      logger.info(`Expense created successfully: ${createdExpense._id} for user ${userId}`);
      return createdExpense;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Error creating expense:', error);
      throw new ApiError('Failed to create expense', 500);
    }
  }

  /**
   * Find expense by ID
   * @param id - Expense ID
   * @returns Promise<Expense | null> - Expense or null if not found
   */
  public async findById(id: string): Promise<Expense | null> {
    try {
      if (!ObjectId.isValid(id)) {
        return null;
      }

      const expense = await this.getCollection().findOne({ _id: new ObjectId(id) });
      return expense;
    } catch (error) {
      logger.error(`Error finding expense by ID ${id}:`, error);
      throw new ApiError('Failed to find expense', 500);
    }
  }

  /**
   * Find expense by ID and user ID
   * @param id - Expense ID
   * @param userId - User ID
   * @returns Promise<Expense | null> - Expense or null if not found
   */
  public async findByIdAndUserId(id: string, userId: string): Promise<Expense | null> {
    try {
      if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
        return null;
      }

      const expense = await this.getCollection().findOne({ 
        _id: new ObjectId(id),
        userId: new ObjectId(userId)
      });
      return expense;
    } catch (error) {
      logger.error(`Error finding expense by ID ${id} and user ${userId}:`, error);
      throw new ApiError('Failed to find expense', 500);
    }
  }

  /**
   * Find expenses with filters and pagination
   * @param filters - Expense filters
   * @returns Promise<{expenses: Expense[], total: number}> - Expenses and total count
   */
  public async findWithFilters(filters: ExpenseFilter): Promise<{ expenses: Expense[]; total: number }> {
    try {
      const query: any = { userId: filters.userId };

      // Add date range filter
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      // Add category filter
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
    } catch (error) {
      logger.error('Error finding expenses with filters:', error);
      throw new ApiError('Failed to fetch expenses', 500);
    }
  }

  /**
   * Update expense by ID and user ID
   * @param id - Expense ID
   * @param userId - User ID
   * @param updates - Update data
   * @returns Promise<Expense | null> - Updated expense or null if not found
   */
  public async updateByIdAndUserId(
    id: string,
    userId: string,
    updates: UpdateExpenseDto
  ): Promise<Expense | null> {
    try {
      if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
        return null;
      }

      const updateDoc = {
        ...updates,
        updatedAt: new Date(),
      };

      const result = await this.getCollection().findOneAndUpdate(
        { 
          _id: new ObjectId(id),
          userId: new ObjectId(userId)
        },
        { $set: updateDoc },
        { returnDocument: 'after' }
      );

      if (result) {
        logger.info(`Expense updated successfully: ${id} for user ${userId}`);
      }

      return result;
    } catch (error) {
      logger.error(`Error updating expense ${id} for user ${userId}:`, error);
      throw new ApiError('Failed to update expense', 500);
    }
  }

  /**
   * Delete expense by ID and user ID
   * @param id - Expense ID
   * @param userId - User ID
   * @returns Promise<boolean> - True if deleted, false if not found
   */
  public async deleteByIdAndUserId(id: string, userId: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
        return false;
      }

      const result = await this.getCollection().deleteOne({ 
        _id: new ObjectId(id),
        userId: new ObjectId(userId)
      });

      if (result.deletedCount === 1) {
        logger.info(`Expense deleted successfully: ${id} for user ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error deleting expense ${id} for user ${userId}:`, error);
      throw new ApiError('Failed to delete expense', 500);
    }
  }

  /**
   * Get expense summary for a user
   * @param userId - User ID
   * @param startDate - Start date filter (optional)
   * @param endDate - End date filter (optional)
   * @returns Promise<ExpenseSummary> - Expense summary
   */
  public async getSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ExpenseSummary> {
    try {
      if (!ObjectId.isValid(userId)) {
        throw new ApiError('Invalid user ID', 400);
      }

      const matchStage: any = { userId: new ObjectId(userId) };

      // Add date range filter
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

      const result = await this.getCollection().aggregate<ExpenseSummary>(pipeline).toArray();

      if (result.length === 0) {
        return {
          totalAmount: 0,
          totalCount: 0,
          categoryBreakdown: []
        };
      }

      return result[0];
    } catch (error) {
      logger.error(`Error getting expense summary for user ${userId}:`, error);
      throw new ApiError('Failed to get expense summary', 500);
    }
  }

  /**
   * Get user's expense count
   * @param userId - User ID
   * @returns Promise<number> - Total number of expenses for user
   */
  public async countByUserId(userId: string): Promise<number> {
    try {
      if (!ObjectId.isValid(userId)) {
        throw new ApiError('Invalid user ID', 400);
      }

      return await this.getCollection().countDocuments({ userId: new ObjectId(userId) });
    } catch (error) {
      logger.error(`Error counting expenses for user ${userId}:`, error);
      throw new ApiError('Failed to count expenses', 500);
    }
  }

  /**
   * Delete all expenses for a user
   * @param userId - User ID
   * @returns Promise<number> - Number of deleted expenses
   */
  public async deleteAllByUserId(userId: string): Promise<number> {
    try {
      if (!ObjectId.isValid(userId)) {
        return 0;
      }

      const result = await this.getCollection().deleteMany({ userId: new ObjectId(userId) });
      
      if (result.deletedCount > 0) {
        logger.info(`Deleted ${result.deletedCount} expenses for user ${userId}`);
      }

      return result.deletedCount;
    } catch (error) {
      logger.error(`Error deleting all expenses for user ${userId}:`, error);
      throw new ApiError('Failed to delete expenses', 500);
    }
  }

  /**
   * Get recent expenses for a user
   * @param userId - User ID
   * @param limit - Number of recent expenses to fetch
   * @returns Promise<Expense[]> - Recent expenses
   */
  public async getRecentByUserId(userId: string, limit: number = 10): Promise<Expense[]> {
    try {
      if (!ObjectId.isValid(userId)) {
        throw new ApiError('Invalid user ID', 400);
      }

      const expenses = await this.getCollection()
        .find({ userId: new ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return expenses;
    } catch (error) {
      logger.error(`Error getting recent expenses for user ${userId}:`, error);
      throw new ApiError('Failed to get recent expenses', 500);
    }
  }
}

export default ExpenseRepository.getInstance();