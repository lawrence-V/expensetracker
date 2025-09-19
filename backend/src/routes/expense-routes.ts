import { Router } from 'express';
import expenseController from '../controllers/expense-controller';
import { authenticateToken } from '../middlewares/auth';
import { validateBody, validateQuery, validateParams } from '../middlewares/validation';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
  expenseIdParamSchema,
  summaryQuerySchema,
} from '../validators/expense-validators';

const router = Router();

// All expense routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/expenses/summary
 * @desc Get expense summary with analytics
 * @access Private
 * @note This route must come before /:id to avoid conflicts
 */
router.get('/summary', validateQuery(summaryQuerySchema), expenseController.getExpenseSummary);

/**
 * @route GET /api/expenses/recent
 * @desc Get recent expenses
 * @access Private
 */
router.get('/recent', expenseController.getRecentExpenses);

/**
 * @route POST /api/expenses
 * @desc Create new expense
 * @access Private
 */
router.post('/', validateBody(createExpenseSchema), expenseController.createExpense);

/**
 * @route GET /api/expenses
 * @desc Get expenses with filtering and pagination
 * @access Private
 * @query period - Time period filter (week, month, 3months, custom)
 * @query startDate - Start date for custom period (YYYY-MM-DD)
 * @query endDate - End date for custom period (YYYY-MM-DD)
 * @query category - Expense category filter
 * @query page - Page number for pagination
 * @query limit - Number of items per page
 */
router.get('/', validateQuery(expenseQuerySchema), expenseController.getExpenses);

/**
 * @route GET /api/expenses/:id
 * @desc Get expense by ID
 * @access Private
 */
router.get('/:id', validateParams(expenseIdParamSchema), expenseController.getExpenseById);

/**
 * @route PUT /api/expenses/:id
 * @desc Update expense
 * @access Private
 */
router.put(
  '/:id',
  validateParams(expenseIdParamSchema),
  validateBody(updateExpenseSchema),
  expenseController.updateExpense
);

/**
 * @route DELETE /api/expenses/:id
 * @desc Delete expense
 * @access Private
 */
router.delete('/:id', validateParams(expenseIdParamSchema), expenseController.deleteExpense);

export default router;