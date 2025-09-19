import { Router } from 'express';
import authRoutes from './auth-routes';
import expenseRoutes from './expense-routes';
import { EXPENSE_CATEGORIES } from '../models/expense-category';
import { createSuccessResponse } from '../models/api-response';

const router = Router();

/**
 * API Routes
 */
router.use('/auth', authRoutes);
router.use('/expenses', expenseRoutes);

/**
 * @route GET /api
 * @desc API information and available endpoints
 * @access Public
 */
router.get('/', (req, res) => {
  res.json(createSuccessResponse({
    message: 'Expense Tracker API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'POST /api/auth/change-password',
        deleteAccount: 'DELETE /api/auth/account',
      },
      expenses: {
        create: 'POST /api/expenses',
        list: 'GET /api/expenses',
        get: 'GET /api/expenses/:id',
        update: 'PUT /api/expenses/:id',
        delete: 'DELETE /api/expenses/:id',
        summary: 'GET /api/expenses/summary',
        recent: 'GET /api/expenses/recent',
      },
    },
    categories: EXPENSE_CATEGORIES,
    documentation: '/api/docs',
  }, 'Welcome to Expense Tracker API'));
});

/**
 * @route GET /api/categories
 * @desc Get available expense categories
 * @access Public
 */
router.get('/categories', (req, res) => {
  res.json(createSuccessResponse(
    EXPENSE_CATEGORIES,
    'Available expense categories'
  ));
});

export default router;