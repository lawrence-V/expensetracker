"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseController = void 0;
const expense_service_1 = __importDefault(require("../services/expense-service"));
const api_response_1 = require("../models/api-response");
const error_handler_1 = require("../middlewares/error-handler");
const logger_1 = __importDefault(require("../utils/logger"));
class ExpenseController {
    constructor() {
        this.createExpense = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            const { title, description, amount, category } = req.body;
            const expense = await expense_service_1.default.createExpense(userId, {
                title,
                description,
                amount,
                category,
            });
            logger_1.default.info(`Expense created: ${expense.id} for user ${userId}`);
            res.status(201).json((0, api_response_1.createSuccessResponse)(expense, 'Expense created successfully'));
        });
        this.getExpenses = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            const queryParams = req.query;
            const result = await expense_service_1.default.getExpenses(userId, queryParams);
            res.json((0, api_response_1.createPaginatedResponse)(result.expenses, result.page, result.limit, result.total, 'Expenses retrieved successfully'));
        });
        this.getExpenseById = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            const { id } = req.params;
            const expense = await expense_service_1.default.getExpenseById(id, userId);
            res.json((0, api_response_1.createSuccessResponse)(expense, 'Expense retrieved successfully'));
        });
        this.updateExpense = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            const { id } = req.params;
            const { title, description, amount, category } = req.body;
            const updatedExpense = await expense_service_1.default.updateExpense(id, userId, {
                title,
                description,
                amount,
                category,
            });
            logger_1.default.info(`Expense updated: ${id} for user ${userId}`);
            res.json((0, api_response_1.createSuccessResponse)(updatedExpense, 'Expense updated successfully'));
        });
        this.deleteExpense = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            const { id } = req.params;
            await expense_service_1.default.deleteExpense(id, userId);
            logger_1.default.info(`Expense deleted: ${id} for user ${userId}`);
            res.json((0, api_response_1.createSuccessResponse)(null, 'Expense deleted successfully'));
        });
        this.getExpenseSummary = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            const queryParams = req.query;
            const summary = await expense_service_1.default.getExpenseSummary(userId, queryParams);
            res.json((0, api_response_1.createSuccessResponse)(summary, 'Expense summary retrieved successfully'));
        });
        this.getRecentExpenses = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            const limit = parseInt(req.query.limit) || 10;
            const expenses = await expense_service_1.default.getRecentExpenses(userId, limit);
            res.json((0, api_response_1.createSuccessResponse)(expenses, 'Recent expenses retrieved successfully'));
        });
    }
}
exports.ExpenseController = ExpenseController;
exports.default = new ExpenseController();
//# sourceMappingURL=expense-controller.js.map