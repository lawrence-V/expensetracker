"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth-routes"));
const expense_routes_1 = __importDefault(require("./expense-routes"));
const expense_category_1 = require("../models/expense-category");
const api_response_1 = require("../models/api-response");
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/expenses', expense_routes_1.default);
router.get('/', (req, res) => {
    res.json((0, api_response_1.createSuccessResponse)({
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
        categories: expense_category_1.EXPENSE_CATEGORIES,
        documentation: '/api/docs',
    }, 'Welcome to Expense Tracker API'));
});
router.get('/categories', (req, res) => {
    res.json((0, api_response_1.createSuccessResponse)(expense_category_1.EXPENSE_CATEGORIES, 'Available expense categories'));
});
exports.default = router;
//# sourceMappingURL=index.js.map