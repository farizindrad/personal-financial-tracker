import type { Paginated } from './index';
import type { Category } from './categories';

export type Budget = {
  id: number;
  categoryId: number;
  month: number;
  year: number;
  budgetAmount: string | number;
  createdAt: string;
  category: Category;
  spent: string | number;
  remaining: string | number;
  percentUsed: number;
};

export type BudgetsResponse = {
  data: Budget[];
  meta: Paginated<Budget>['meta'] & { month: number; year: number };
};

export type BudgetInput = {
  categoryId: number;
  month: number;
  year: number;
  budgetAmount: number;
};
