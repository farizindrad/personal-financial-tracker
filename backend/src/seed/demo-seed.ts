import {
  AccountType,
  AssetType,
  CategoryType,
  LiabilityType,
  PrismaClient,
  RecurringFrequency,
  TransactionType,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const FALLBACK_DEMO_EMAIL = 'demo@ledger.app';

export function resolveDemoEmail(): string {
  return process.env.DEMO_EMAIL?.trim() || FALLBACK_DEMO_EMAIL;
}

export function resolveDemoPassword(): string {
  return process.env.DEMO_PASSWORD?.trim() || 'demo1234';
}

export const DEMO_EMAIL = resolveDemoEmail();
export const DEMO_PASSWORD = resolveDemoPassword();
export const DEMO_NAME = process.env.DEMO_NAME?.trim() || 'Demo User';

/**
 * Seed data demo yang kaya (transaksi tersebar di bulan berjalan).
 * Idempotent: hapus user demo (cascade menghapus semua datanya) lalu buat ulang.
 * Dipakai seed.ts (prisma db seed) & DemoResetScheduler (IS_DEMO=true).
 */
async function deleteUsersAndOwnedRows(
  prisma: PrismaClient,
  emails: string[],
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) {
    return;
  }
  // User ON DELETE CASCADE does not cover account_id on trx/goals/recurring.
  // deleteMany(users) hits P2003; wipe children first (no per-row loop).
  await prisma.transaction.deleteMany({ where: { userId: { in: ids } } });
  await prisma.budget.deleteMany({ where: { userId: { in: ids } } });
  await prisma.recurringTransaction.deleteMany({ where: { userId: { in: ids } } });
  await prisma.savingsGoal.deleteMany({ where: { userId: { in: ids } } });
  await prisma.category.deleteMany({ where: { userId: { in: ids } } });
  await prisma.account.deleteMany({ where: { userId: { in: ids } } });
  await prisma.asset.deleteMany({ where: { userId: { in: ids } } });
  await prisma.liability.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

export async function seedDemoData(
  prisma: PrismaClient,
  email: string = resolveDemoEmail(),
  password: string = resolveDemoPassword(),
  name: string = DEMO_NAME,
): Promise<number> {
  await deleteUsersAndOwnedRows(prisma, [
    ...new Set([email, FALLBACK_DEMO_EMAIL]),
  ]);

  const user = await prisma.user.create({
    data: { email, passwordHash: await hash(password, 10), name },
  });
  const userId = user.id;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // ---- Akun
  const accounts = await prisma.account.createMany({
    data: [
      {
        userId,
        name: 'BCA',
        type: AccountType.bank,
        initialBalance: 5_000_000,
      },
      {
        userId,
        name: 'BRI',
        type: AccountType.bank,
        initialBalance: 2_000_000,
      },
      {
        userId,
        name: 'GoPay',
        type: AccountType.e_wallet,
        initialBalance: 500_000,
      },
      { userId, name: 'Cash', type: AccountType.cash, initialBalance: 300_000 },
    ],
  });

  const [bca, bri, gopay, cash] = await prisma.account.findMany({
    where: { userId },
    orderBy: { id: 'asc' },
  });

  // ---- Kategori
  const incomeCategories = [
    {
      userId,
      name: 'Gaji',
      type: CategoryType.income,
      icon: 'bank',
      color: '#1a73e8',
    },
    {
      userId,
      name: 'Bonus',
      type: CategoryType.income,
      icon: 'star',
      color: '#34a853',
    },
    {
      userId,
      name: 'Freelance',
      type: CategoryType.income,
      icon: 'briefcase',
      color: '#f9ab00',
    },
  ];
  await prisma.category.createMany({ data: incomeCategories });

  const expenseRoots = [
    {
      userId,
      name: 'Makanan',
      type: CategoryType.expense,
      icon: 'bowl-food',
      color: '#ea4335',
    },
    {
      userId,
      name: 'Transportasi',
      type: CategoryType.expense,
      icon: 'car',
      color: '#1a73e8',
    },
    {
      userId,
      name: 'Tagihan',
      type: CategoryType.expense,
      icon: 'receipt',
      color: '#f9ab00',
    },
    {
      userId,
      name: 'Hiburan',
      type: CategoryType.expense,
      icon: 'game-controller',
      color: '#9334e6',
    },
    {
      userId,
      name: 'Belanja',
      type: CategoryType.expense,
      icon: 'bag',
      color: '#e8710a',
    },
    {
      userId,
      name: 'Kesehatan',
      type: CategoryType.expense,
      icon: 'heart',
      color: '#d93025',
    },
  ];
  await prisma.category.createMany({ data: expenseRoots });

  const roots = await prisma.category.findMany({
    where: { userId, parentId: null },
    orderBy: { id: 'asc' },
  });
  const makanan = roots.find((c) => c.name === 'Makanan')!;
  const transportasi = roots.find((c) => c.name === 'Transportasi')!;
  const tagihan = roots.find((c) => c.name === 'Tagihan')!;
  const hiburan = roots.find((c) => c.name === 'Hiburan')!;

  const gaji = await prisma.category.findFirstOrThrow({
    where: { userId, name: 'Gaji', type: CategoryType.income },
  });
  const bonus = await prisma.category.findFirstOrThrow({
    where: { userId, name: 'Bonus', type: CategoryType.income },
  });

  await prisma.category.createMany({
    data: [
      {
        userId,
        name: 'Makan di luar',
        type: CategoryType.expense,
        parentId: makanan.id,
      },
      {
        userId,
        name: 'Belanja bulanan',
        type: CategoryType.expense,
        parentId: makanan.id,
      },
      {
        userId,
        name: 'Bensin',
        type: CategoryType.expense,
        parentId: transportasi.id,
      },
      {
        userId,
        name: 'Grab/Gojek',
        type: CategoryType.expense,
        parentId: transportasi.id,
      },
      {
        userId,
        name: 'Listrik & Air',
        type: CategoryType.expense,
        parentId: tagihan.id,
      },
      {
        userId,
        name: 'Internet',
        type: CategoryType.expense,
        parentId: tagihan.id,
      },
      {
        userId,
        name: 'Langganan',
        type: CategoryType.expense,
        parentId: hiburan.id,
      },
    ],
  });

  const sub = await prisma.category.findMany({
    where: { userId, parentId: { not: null } },
  });
  const makanDiLuar = sub.find((c) => c.name === 'Makan di luar')!;
  const belanjaBulanan = sub.find((c) => c.name === 'Belanja bulanan')!;
  const bensin = sub.find((c) => c.name === 'Bensin')!;
  const grab = sub.find((c) => c.name === 'Grab/Gojek')!;
  const listrik = sub.find((c) => c.name === 'Listrik & Air')!;
  const internet = sub.find((c) => c.name === 'Internet')!;
  const langganan = sub.find((c) => c.name === 'Langganan')!;

  const date = (day: number) => new Date(Date.UTC(year, month - 1, day));

  // ---- Transaksi bulan berjalan (tersebar agar kalender terlihat hidup)
  const transactions = [
    // income
    {
      userId,
      accountId: bca.id,
      categoryId: gaji.id,
      type: 'income',
      amount: 12_000_000,
      transactionDate: date(2),
      description: 'Gaji bulanan',
    },
    {
      userId,
      accountId: bca.id,
      categoryId: bonus.id,
      type: 'income',
      amount: 1_500_000,
      transactionDate: date(15),
      description: 'Bonus performa',
    },
    // expenses
    {
      userId,
      accountId: gopay.id,
      categoryId: makanDiLuar.id,
      type: 'expense',
      amount: 65_000,
      transactionDate: date(3),
      description: 'Lunch meeting',
    },
    {
      userId,
      accountId: gopay.id,
      categoryId: grab.id,
      type: 'expense',
      amount: 28_000,
      transactionDate: date(4),
      description: 'Gojek ke kantor',
    },
    {
      userId,
      accountId: bca.id,
      categoryId: listrik.id,
      type: 'expense',
      amount: 350_000,
      transactionDate: date(5),
      description: 'Token listrik',
    },
    {
      userId,
      accountId: bri.id,
      categoryId: internet.id,
      type: 'expense',
      amount: 320_000,
      transactionDate: date(6),
      description: 'Internet bulanan',
    },
    {
      userId,
      accountId: bca.id,
      categoryId: belanjaBulanan.id,
      type: 'expense',
      amount: 1_250_000,
      transactionDate: date(7),
      description: 'Belanja mingguan',
    },
    {
      userId,
      accountId: cash.id,
      categoryId: bensin.id,
      type: 'expense',
      amount: 150_000,
      transactionDate: date(8),
      description: 'Isi bensin',
    },
    {
      userId,
      accountId: gopay.id,
      categoryId: makanDiLuar.id,
      type: 'expense',
      amount: 45_000,
      transactionDate: date(10),
      description: 'Makan siang',
    },
    {
      userId,
      accountId: bca.id,
      categoryId: langganan.id,
      type: 'expense',
      amount: 159_000,
      transactionDate: date(12),
      description: 'Netflix',
    },
    {
      userId,
      accountId: gopay.id,
      categoryId: grab.id,
      type: 'expense',
      amount: 35_000,
      transactionDate: date(13),
      description: 'Gojek pulang',
    },
    {
      userId,
      accountId: bri.id,
      categoryId: makanDiLuar.id,
      type: 'expense',
      amount: 210_000,
      transactionDate: date(15),
      description: 'Makan keluarga',
    },
    {
      userId,
      accountId: bca.id,
      categoryId: belanjaBulanan.id,
      type: 'expense',
      amount: 980_000,
      transactionDate: date(18),
      description: 'Belanja kebutuhan rumah',
    },
    {
      userId,
      accountId: gopay.id,
      categoryId: makanDiLuar.id,
      type: 'expense',
      amount: 52_000,
      transactionDate: date(20),
      description: 'Kopi + pastry',
    },
    {
      userId,
      accountId: cash.id,
      categoryId: bensin.id,
      type: 'expense',
      amount: 120_000,
      transactionDate: date(22),
      description: 'Isi bensin',
    },
    {
      userId,
      accountId: bca.id,
      categoryId: langganan.id,
      type: 'expense',
      amount: 89_000,
      transactionDate: date(24),
      description: 'Spotify',
    },
    {
      userId,
      accountId: gopay.id,
      categoryId: grab.id,
      type: 'expense',
      amount: 30_000,
      transactionDate: date(26),
      description: 'Gojek',
    },
  ];
  await prisma.transaction.createMany({
    data: transactions.map((t) => ({
      userId: t.userId,
      accountId: t.accountId,
      categoryId: t.categoryId,
      type: t.type as TransactionType,
      amount: t.amount,
      transactionDate: t.transactionDate,
      description: t.description,
    })),
  });

  // ---- Budget bulan berjalan
  await prisma.budget.createMany({
    data: [
      { userId, categoryId: makanan.id, month, year, budgetAmount: 1_500_000 },
      {
        userId,
        categoryId: transportasi.id,
        month,
        year,
        budgetAmount: 800_000,
      },
      { userId, categoryId: tagihan.id, month, year, budgetAmount: 1_000_000 },
      { userId, categoryId: hiburan.id, month, year, budgetAmount: 500_000 },
    ],
  });

  // ---- Recurring
  await prisma.recurringTransaction.createMany({
    data: [
      {
        userId,
        accountId: bca.id,
        categoryId: gaji.id,
        type: 'income',
        amount: 12_000_000,
        description: 'Gaji',
        frequency: RecurringFrequency.monthly,
        startDate: date(1),
        nextRunDate: date(1),
      },
      {
        userId,
        accountId: bca.id,
        categoryId: listrik.id,
        type: 'expense',
        amount: 350_000,
        description: 'Listrik',
        frequency: RecurringFrequency.monthly,
        startDate: date(1),
        nextRunDate: date(5),
      },
      {
        userId,
        accountId: bri.id,
        categoryId: internet.id,
        type: 'expense',
        amount: 320_000,
        description: 'Internet',
        frequency: RecurringFrequency.monthly,
        startDate: date(1),
        nextRunDate: date(6),
      },
      {
        userId,
        accountId: bca.id,
        categoryId: langganan.id,
        type: 'expense',
        amount: 159_000,
        description: 'Netflix',
        frequency: RecurringFrequency.monthly,
        startDate: date(1),
        nextRunDate: date(12),
      },
    ],
  });

  // ---- Savings goals
  await prisma.savingsGoal.createMany({
    data: [
      {
        userId,
        name: 'Dana Darurat',
        targetAmount: 50_000_000,
        accountId: bri.id,
        targetDate: date(1),
      },
      {
        userId,
        name: 'Liburan Bali',
        targetAmount: 15_000_000,
        accountId: gopay.id,
      },
    ],
  });

  // ---- Aset & liabilitas
  await prisma.asset.createMany({
    data: [
      {
        userId,
        name: 'Rumah',
        type: AssetType.property,
        value: 600_000_000,
        notes: 'KPR berjalan',
      },
      { userId, name: 'Mobil', type: AssetType.vehicle, value: 180_000_000 },
      { userId, name: 'Emas 25gr', type: AssetType.gold, value: 35_000_000 },
      {
        userId,
        name: 'Reksa Dana',
        type: AssetType.investment,
        value: 25_000_000,
      },
    ],
  });

  await prisma.liability.createMany({
    data: [
      { userId, name: 'KPR', type: LiabilityType.loan, amount: 350_000_000 },
      {
        userId,
        name: 'Kartu Kredit BCA',
        type: LiabilityType.credit_card,
        amount: 2_800_000,
      },
    ],
  });

  console.log(
    `Seed OK — user demo: ${email} / ${password} (accounts=${accounts.count}, transactions=${transactions.length})`,
  );

  return userId;
}

/** Cepat bersihkan semua data (tanpa sentuh users) — dipakai scheduler reset */
export async function clearAllData(prisma: PrismaClient): Promise<void> {
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.recurringTransaction.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.liability.deleteMany();
  await prisma.user.deleteMany();
}
