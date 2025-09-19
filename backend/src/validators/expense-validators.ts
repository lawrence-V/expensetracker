import Joi from 'joi';
import { EXPENSE_CATEGORIES } from '../models/expense-category';

// Create expense validation schema
export const createExpenseSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required',
    }),
    
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),
    
  amount: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .required()
    .messages({
      'number.positive': 'Amount must be a positive number',
      'number.max': 'Amount cannot exceed 999,999.99',
      'any.required': 'Amount is required',
    }),
    
  category: Joi.string()
    .valid(...EXPENSE_CATEGORIES)
    .required()
    .messages({
      'any.only': `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
      'any.required': 'Category is required',
    }),
});

// Update expense validation schema
export const updateExpenseSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters',
    }),
    
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),
    
  amount: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .messages({
      'number.positive': 'Amount must be a positive number',
      'number.max': 'Amount cannot exceed 999,999.99',
    }),
    
  category: Joi.string()
    .valid(...EXPENSE_CATEGORIES)
    .messages({
      'any.only': `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Expense query parameters validation schema
export const expenseQuerySchema = Joi.object({
  period: Joi.string()
    .valid('week', 'month', '3months', 'custom')
    .messages({
      'any.only': 'Period must be one of: week, month, 3months, custom',
    }),
    
  startDate: Joi.string()
    .isoDate()
    .when('period', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.isoDate': 'Start date must be in ISO format (YYYY-MM-DD)',
      'any.required': 'Start date is required when period is custom',
    }),
    
  endDate: Joi.string()
    .isoDate()
    .when('period', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.isoDate': 'End date must be in ISO format (YYYY-MM-DD)',
      'any.required': 'End date is required when period is custom',
    }),
    
  category: Joi.string()
    .valid(...EXPENSE_CATEGORIES)
    .messages({
      'any.only': `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
    }),
    
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
    }),
    
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
});

// MongoDB ObjectId validation
export const mongoIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
    'any.required': 'ID is required',
  });

// Expense ID parameter validation
export const expenseIdParamSchema = Joi.object({
  id: mongoIdSchema,
});

// Summary query parameters validation schema
export const summaryQuerySchema = Joi.object({
  period: Joi.string()
    .valid('week', 'month', '3months', 'custom')
    .messages({
      'any.only': 'Period must be one of: week, month, 3months, custom',
    }),
    
  startDate: Joi.string()
    .isoDate()
    .when('period', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.isoDate': 'Start date must be in ISO format (YYYY-MM-DD)',
      'any.required': 'Start date is required when period is custom',
    }),
    
  endDate: Joi.string()
    .isoDate()
    .when('period', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.isoDate': 'End date must be in ISO format (YYYY-MM-DD)',
      'any.required': 'End date is required when period is custom',
    }),
});