"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expense_controller_1 = __importDefault(require("../controllers/expense-controller"));
const auth_1 = require("../middlewares/auth");
const validation_1 = require("../middlewares/validation");
const expense_validators_1 = require("../validators/expense-validators");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/summary', (0, validation_1.validateQuery)(expense_validators_1.summaryQuerySchema), expense_controller_1.default.getExpenseSummary);
router.get('/recent', expense_controller_1.default.getRecentExpenses);
router.post('/', (0, validation_1.validateBody)(expense_validators_1.createExpenseSchema), expense_controller_1.default.createExpense);
router.get('/', (0, validation_1.validateQuery)(expense_validators_1.expenseQuerySchema), expense_controller_1.default.getExpenses);
router.get('/:id', (0, validation_1.validateParams)(expense_validators_1.expenseIdParamSchema), expense_controller_1.default.getExpenseById);
router.put('/:id', (0, validation_1.validateParams)(expense_validators_1.expenseIdParamSchema), (0, validation_1.validateBody)(expense_validators_1.updateExpenseSchema), expense_controller_1.default.updateExpense);
router.delete('/:id', (0, validation_1.validateParams)(expense_validators_1.expenseIdParamSchema), expense_controller_1.default.deleteExpense);
exports.default = router;
//# sourceMappingURL=expense-routes.js.map