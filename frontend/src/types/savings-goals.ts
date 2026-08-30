import type { Paginated } from './index';
import type { Account } from './accounts';

export type SavingsGoal = {
  id: number;
  name: string;
  targetAmount: string | number;
  targetDate: string | null;
  accountId: number | null;
  notes: string | null;
  createdAt: string;
  account: Account | null;
  currentAmount: string | number;
  remaining: string | number;
  percentComplete: number;
  isCompleted: boolean;
};

export type SavingsGoalsResponse = Paginated<SavingsGoal>;

export type SavingsGoalInput = {
  name: string;
  targetAmount: number;
  targetDate?: string;
  accountId?: number;
  notes?: string;
};

export type SavingsGoalUpdateInput = {
  name?: string;
  targetAmount?: number;
  targetDate?: string | null;
  accountId?: number | null;
  notes?: string;
};
