import type { Paginated } from './index';

export type AccountType = 'bank' | 'cash' | 'e_wallet' | 'other';

export type Account = {
  id: number;
  name: string;
  type: AccountType;
  initialBalance: string | number;
  isActive: boolean;
  notes: string | null;
  currentBalance?: string | number;
};

export type AccountsResponse = Paginated<Account>;

export type AccountInput = {
  name: string;
  type?: AccountType;
  initialBalance?: number;
  notes?: string;
};
