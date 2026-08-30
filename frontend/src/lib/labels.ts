import type { AccountType } from '../types/accounts';
import type { CategoryType } from '../types/categories';
import type { TransactionType } from '../types/transactions';

/** UI copy — API enums stay English. */

export const PAGE = {
  dashboard: 'Ringkasan',
  accounts: 'Akun',
  categories: 'Kategori',
  transactions: 'Transaksi',
  budgets: 'Anggaran',
  savingsGoals: 'Target tabungan',
  assets: 'Aset',
  calendar: 'Kalender',
} as const;

export const TX_TYPE_LABEL: Record<TransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Pindah akun',
};

export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
};

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  bank: 'Bank',
  cash: 'Tunai',
  e_wallet: 'E-Wallet',
  other: 'Lainnya',
};

export const ASSET_TYPES = [
  { value: 'property', label: 'Properti' },
  { value: 'vehicle', label: 'Kendaraan' },
  { value: 'investment', label: 'Investasi' },
  { value: 'gold', label: 'Emas' },
  { value: 'cash', label: 'Tunai' },
  { value: 'other', label: 'Lainnya' },
] as const;

export const LIABILITY_TYPES = [
  { value: 'credit_card', label: 'Kartu kredit' },
  { value: 'loan', label: 'Pinjaman' },
  { value: 'other', label: 'Lainnya' },
] as const;

export const UI = {
  prev: 'Sebelumnya',
  next: 'Berikutnya',
  sync: 'diperbarui',
  loading: 'memuat…',
  save: 'Simpan',
  update: 'Simpan',
  cancel: 'Batal',
  edit: 'Edit',
  delete: 'Hapus',
  deactivate: 'Nonaktifkan',
  budgeted: 'Ditargetkan',
  spent: 'Terpakai',
  budgetRemaining: 'Sisa anggaran',
  setBudget: 'Atur anggaran',
  cashWithdraw: 'Tarik tunai',
  addTransaction: 'Catat transaksi',
  addAccount: 'Tambah akun',
  addCategory: 'Tambah kategori',
  addGoal: 'Target baru',
  all: 'Semua',
  netThisMonth: 'Selisih bulan ini',
  checkBudget: 'Cek anggaran',
} as const;

export function fetchingHint(isFetching: boolean): string {
  return isFetching ? ` · ${UI.sync}` : '';
}
