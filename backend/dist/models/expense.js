"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformExpenseToResponse = void 0;
const transformExpenseToResponse = (expense) => ({
    id: expense._id.toHexString(),
    userId: expense.userId.toHexString(),
    title: expense.title,
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
});
exports.transformExpenseToResponse = transformExpenseToResponse;
//# sourceMappingURL=expense.js.map