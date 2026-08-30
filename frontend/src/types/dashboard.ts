export type AccountSummary = {
  id: number;
  name: string;
  type: string;
};

export type CategorySummary = {
  id: number;
  name: string;
  type: string;
  color: string | null;
};

export type RecentTransaction = {
  id: number;
  type: 'income' | 'expense' | 'transfer';
  amount: string | number;
  transactionDate: string;
  description: string | null;
  account: AccountSummary;
  category: CategorySummary | null;
  transferToAccount: AccountSummary | null;
};

export type DashboardSummary = {
  totalBalance: string | number;
  incomeThisMonth: string | number;
  expenseThisMonth: string | number;
  netThisMonth: string | number;
  assetTotal: string | number;
  liabilityTotal: string | number;
  netWorth: string | number;
  period: { month: number; year: number };
  recentTransactions: RecentTransaction[];
};

export type DailySummary = {
  month: number;
  year: number;
  data: Array<{
    date: string;
    income: string | number;
    expense: string | number;
    net: string | number;
  }>;
};
