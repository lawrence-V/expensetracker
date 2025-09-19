import { ObjectId } from 'mongodb';
import { ExpenseCategory } from './expense-category';

export interface Expense {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  description?: string;
  amount: number;
  category: ExpenseCategory;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseDto {
  title: string;
  description?: string;
  amount: number;
  category: ExpenseCategory;
}

export interface UpdateExpenseDto {
  title?: string;
  description?: string;
  amount?: number;
  category?: ExpenseCategory;
}

export interface ExpenseResponse {
  id: string;
  userId: string;
  title: string;
  description?: string;
  amount: number;
  category: ExpenseCategory;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseFilter {
  userId: ObjectId;
  startDate?: Date;
  endDate?: Date;
  category?: ExpenseCategory;
  limit?: number;
  offset?: number;
}

export interface ExpenseQueryParams {
  period?: 'week' | 'month' | '3months' | 'custom';
  startDate?: string;
  endDate?: string;
  category?: string;
  page?: string;
  limit?: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  categoryBreakdown: Array<{
    category: ExpenseCategory;
    amount: number;
    count: number;
  }>;
}

export const transformExpenseToResponse = (expense: Expense): ExpenseResponse => ({
  id: expense._id!.toHexString(),
  userId: expense.userId.toHexString(),
  title: expense.title,
  description: expense.description,
  amount: expense.amount,
  category: expense.category,
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt,
});