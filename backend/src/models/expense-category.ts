export enum ExpenseCategory {
  GROCERIES = 'Groceries',
  LEISURE = 'Leisure',
  ELECTRONICS = 'Electronics',
  UTILITIES = 'Utilities',
  CLOTHING = 'Clothing',
  HEALTH = 'Health',
  OTHERS = 'Others'
}

export const EXPENSE_CATEGORIES = Object.values(ExpenseCategory);

export const isValidExpenseCategory = (category: string): category is ExpenseCategory => {
  return EXPENSE_CATEGORIES.includes(category as ExpenseCategory);
};