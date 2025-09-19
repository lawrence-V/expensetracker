"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summaryQuerySchema = exports.expenseIdParamSchema = exports.mongoIdSchema = exports.expenseQuerySchema = exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const expense_category_1 = require("../models/expense-category");
exports.createExpenseSchema = joi_1.default.object({
    title: joi_1.default.string()
        .trim()
        .min(3)
        .max(100)
        .required()
        .messages({
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required',
    }),
    description: joi_1.default.string()
        .trim()
        .max(500)
        .optional()
        .messages({
        'string.max': 'Description cannot exceed 500 characters',
    }),
    amount: joi_1.default.number()
        .positive()
        .precision(2)
        .max(999999.99)
        .required()
        .messages({
        'number.positive': 'Amount must be a positive number',
        'number.max': 'Amount cannot exceed 999,999.99',
        'any.required': 'Amount is required',
    }),
    category: joi_1.default.string()
        .valid(...expense_category_1.EXPENSE_CATEGORIES)
        .required()
        .messages({
        'any.only': `Category must be one of: ${expense_category_1.EXPENSE_CATEGORIES.join(', ')}`,
        'any.required': 'Category is required',
    }),
});
exports.updateExpenseSchema = joi_1.default.object({
    title: joi_1.default.string()
        .trim()
        .min(3)
        .max(100)
        .messages({
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 100 characters',
    }),
    description: joi_1.default.string()
        .trim()
        .max(500)
        .allow('')
        .messages({
        'string.max': 'Description cannot exceed 500 characters',
    }),
    amount: joi_1.default.number()
        .positive()
        .precision(2)
        .max(999999.99)
        .messages({
        'number.positive': 'Amount must be a positive number',
        'number.max': 'Amount cannot exceed 999,999.99',
    }),
    category: joi_1.default.string()
        .valid(...expense_category_1.EXPENSE_CATEGORIES)
        .messages({
        'any.only': `Category must be one of: ${expense_category_1.EXPENSE_CATEGORIES.join(', ')}`,
    }),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
});
exports.expenseQuerySchema = joi_1.default.object({
    period: joi_1.default.string()
        .valid('week', 'month', '3months', 'custom')
        .messages({
        'any.only': 'Period must be one of: week, month, 3months, custom',
    }),
    startDate: joi_1.default.string()
        .isoDate()
        .when('period', {
        is: 'custom',
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional(),
    })
        .messages({
        'string.isoDate': 'Start date must be in ISO format (YYYY-MM-DD)',
        'any.required': 'Start date is required when period is custom',
    }),
    endDate: joi_1.default.string()
        .isoDate()
        .when('period', {
        is: 'custom',
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional(),
    })
        .messages({
        'string.isoDate': 'End date must be in ISO format (YYYY-MM-DD)',
        'any.required': 'End date is required when period is custom',
    }),
    category: joi_1.default.string()
        .valid(...expense_category_1.EXPENSE_CATEGORIES)
        .messages({
        'any.only': `Category must be one of: ${expense_category_1.EXPENSE_CATEGORIES.join(', ')}`,
    }),
    page: joi_1.default.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1',
    }),
    limit: joi_1.default.number()
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
exports.mongoIdSchema = joi_1.default.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
    'string.pattern.base': 'Invalid ID format',
    'any.required': 'ID is required',
});
exports.expenseIdParamSchema = joi_1.default.object({
    id: exports.mongoIdSchema,
});
exports.summaryQuerySchema = joi_1.default.object({
    period: joi_1.default.string()
        .valid('week', 'month', '3months', 'custom')
        .messages({
        'any.only': 'Period must be one of: week, month, 3months, custom',
    }),
    startDate: joi_1.default.string()
        .isoDate()
        .when('period', {
        is: 'custom',
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional(),
    })
        .messages({
        'string.isoDate': 'Start date must be in ISO format (YYYY-MM-DD)',
        'any.required': 'Start date is required when period is custom',
    }),
    endDate: joi_1.default.string()
        .isoDate()
        .when('period', {
        is: 'custom',
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional(),
    })
        .messages({
        'string.isoDate': 'End date must be in ISO format (YYYY-MM-DD)',
        'any.required': 'End date is required when period is custom',
    }),
});
//# sourceMappingURL=expense-validators.js.map