"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidExpenseCategory = exports.EXPENSE_CATEGORIES = exports.ExpenseCategory = void 0;
var ExpenseCategory;
(function (ExpenseCategory) {
    ExpenseCategory["GROCERIES"] = "Groceries";
    ExpenseCategory["LEISURE"] = "Leisure";
    ExpenseCategory["ELECTRONICS"] = "Electronics";
    ExpenseCategory["UTILITIES"] = "Utilities";
    ExpenseCategory["CLOTHING"] = "Clothing";
    ExpenseCategory["HEALTH"] = "Health";
    ExpenseCategory["OTHERS"] = "Others";
})(ExpenseCategory || (exports.ExpenseCategory = ExpenseCategory = {}));
exports.EXPENSE_CATEGORIES = Object.values(ExpenseCategory);
const isValidExpenseCategory = (category) => {
    return exports.EXPENSE_CATEGORIES.includes(category);
};
exports.isValidExpenseCategory = isValidExpenseCategory;
//# sourceMappingURL=expense-category.js.map