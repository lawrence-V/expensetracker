import { Request, Response } from 'express';
import expenseService from '../services/expense-service';
import { createSuccessResponse, createPaginatedResponse } from '../models/api-response';
import { asyncHandler } from '../middlewares/error-handler';
import logger from '../utils/logger';

export class ExpenseController {
  /**
   * Create new expense
   * POST /api/expenses
   */
  public createExpense = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { title, description, amount, category } = req.body;

    const expense = await expenseService.createExpense(userId, {
      title,
      description,
      amount,
      category,
    });

    logger.info(`Expense created: ${expense.id} for user ${userId}`);

    res.status(201).json(createSuccessResponse(
      expense,
      'Expense created successfully'
    ));
  });

  /**
   * Get expenses with filtering and pagination
   * GET /api/expenses
   */
  public getExpenses = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const queryParams = req.query;

    const result = await expenseService.getExpenses(userId, queryParams);

    res.json(createPaginatedResponse(
      result.expenses,
      result.page,
      result.limit,
      result.total,
      'Expenses retrieved successfully'
    ));
  });

  /**
   * Get expense by ID
   * GET /api/expenses/:id
   */
  public getExpenseById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const expense = await expenseService.getExpenseById(id, userId);

    res.json(createSuccessResponse(
      expense,
      'Expense retrieved successfully'
    ));
  });

  /**
   * Update expense
   * PUT /api/expenses/:id
   */
  public updateExpense = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { title, description, amount, category } = req.body;

    const updatedExpense = await expenseService.updateExpense(id, userId, {
      title,
      description,
      amount,
      category,
    });

    logger.info(`Expense updated: ${id} for user ${userId}`);

    res.json(createSuccessResponse(
      updatedExpense,
      'Expense updated successfully'
    ));
  });

  /**
   * Delete expense
   * DELETE /api/expenses/:id
   */
  public deleteExpense = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    await expenseService.deleteExpense(id, userId);

    logger.info(`Expense deleted: ${id} for user ${userId}`);

    res.json(createSuccessResponse(
      null,
      'Expense deleted successfully'
    ));
  });

  /**
   * Get expense summary with analytics
   * GET /api/expenses/summary
   */
  public getExpenseSummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const queryParams = req.query;

    const summary = await expenseService.getExpenseSummary(userId, queryParams);

    res.json(createSuccessResponse(
      summary,
      'Expense summary retrieved successfully'
    ));
  });

  /**
   * Get recent expenses
   * GET /api/expenses/recent
   */
  public getRecentExpenses = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const expenses = await expenseService.getRecentExpenses(userId, limit);

    res.json(createSuccessResponse(
      expenses,
      'Recent expenses retrieved successfully'
    ));
  });
}

export default new ExpenseController();