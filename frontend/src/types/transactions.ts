import type { Paginated } from './index';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionAccount = {
  id: number;
  name: string;
  type: string;
};

export type TransactionCategory = {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string | null;
  parentId: number | null;
};

export type Transaction = {
  id: number;
  accountId: number;
  categoryId: number | null;
  type: TransactionType;
  amount: string | number;
  transactionDate: string;
  description: string | null;
  transferToAccountId: number | null;
  account: TransactionAccount;
  category: TransactionCategory | null;
  transferToAccount: TransactionAccount | null;
};

export type TransactionsResponse = Paginated<Transaction>;

export type TransactionFilters = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  accountId?: number;
  categoryId?: number;
};

export type TransactionInput = {
  accountId: number;
  categoryId?: number;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description?: string;
  transferToAccountId?: number;
};
