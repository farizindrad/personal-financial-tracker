const fs = require('fs'), os = require('os'), path = require('path');
const { randomUUID } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { loadTestEnvironment, validateTestDatabase } = require('./test-database.cjs');
const { backupDatabase } = require('./backup-db.cjs');
const { restoreDatabase } = require('./restore-db.cjs');

async function snapshot(p) {
  const counts = await Promise.all(['user', 'account', 'category', 'transaction', 'budget', 'savingsGoal', 'asset', 'liability', 'recurringTransaction'].map((name) => p[name].count()));
  const balances = await p.vAccountBalance.findMany({ orderBy: { accountId: 'asc' } });
  const monthly = await p.$queryRawUnsafe('SELECT * FROM v_monthly_summary ORDER BY year, month, category_name, type');
  return JSON.stringify({ counts, balances, monthly }, (_, value) => typeof value === 'bigint' ? value.toString() : value);
}

async function clearRestore(p) {
  await p.$executeRawUnsafe('DROP VIEW IF EXISTS `v_account_balances`');
  await p.$executeRawUnsafe('DROP VIEW IF EXISTS `v_monthly_summary`');
  for (const name of ['transactions', 'budgets', 'savings_goals', 'recurring_transactions', 'assets', 'liabilities', 'categories', 'accounts', 'users', '_prisma_migrations']) await p.$executeRawUnsafe('DROP TABLE IF EXISTS `' + name + '`');
}

async function main() {
  loadTestEnvironment();
  validateTestDatabase({ TEST_DATABASE_URL: process.env.RESTORE_TEST_DATABASE_URL, ALLOW_TEST_DB_RESET: process.env.ALLOW_TEST_DB_RESET });
  if (new URL(process.env.RESTORE_TEST_DATABASE_URL).pathname === new URL(process.env.TEST_DATABASE_URL).pathname) throw new Error('RESTORE_SOURCE_EQUALS_TARGET');
  const p = new PrismaClient();
  const restored = new PrismaClient({ datasources: { db: { url: process.env.RESTORE_TEST_DATABASE_URL } } });
  let user;
  let restoreAttempted = false;
  const started = Date.now();
  try {
    if ((await restored.$queryRawUnsafe('SHOW FULL TABLES')).length) throw new Error('RESTORE_TARGET_NOT_EMPTY');
    user = await p.user.create({ data: { email: 'restore-' + randomUUID() + '@example.test', passwordHash: 'unused-fixture-only' } });
    const account = await p.account.create({ data: { userId: user.id, name: 'Restore fixture', initialBalance: 1000 } });
    const income = await p.category.create({ data: { userId: user.id, name: 'Income', type: 'income' } });
    const expense = await p.category.create({ data: { userId: user.id, name: 'Expense', type: 'expense' } });
    await p.transaction.createMany({ data: [
      { userId: user.id, accountId: account.id, categoryId: income.id, type: 'income', amount: '123.45', transactionDate: new Date('2026-10-01') },
      { userId: user.id, accountId: account.id, categoryId: expense.id, type: 'expense', amount: '23.45', transactionDate: new Date('2026-10-02') },
    ] });
    await p.budget.create({ data: { userId: user.id, categoryId: expense.id, month: 10, year: 2026, budgetAmount: 100 } });
    await p.savingsGoal.create({ data: { userId: user.id, accountId: account.id, name: 'Reserve', targetAmount: 2000 } });
    await p.asset.create({ data: { userId: user.id, name: 'Asset', value: 500 } });
    await p.liability.create({ data: { userId: user.id, name: 'Debt', amount: 200 } });
    const expected = await snapshot(p);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-restore-drill-'));
    const env = { ...process.env, BACKUP_DATABASE_URL: process.env.TEST_DATABASE_URL, BACKUP_DIR: directory };
    const file = await backupDatabase(env);
    restoreAttempted = true;
    await restoreDatabase(file, env);
    if (await snapshot(restored) !== expected) throw new Error('RESTORE_RECONCILIATION_FAILED');
    // Verify restored views do not secretly keep reading the source schema.
    await p.transaction.create({ data: { userId: user.id, accountId: account.id, categoryId: expense.id, type: 'expense', amount: 1, transactionDate: new Date('2026-10-03') } });
    if (await snapshot(restored) !== expected) throw new Error('RESTORED_VIEW_READS_SOURCE');
    console.log(JSON.stringify({ event: 'restore_drill', outcome: 'success', dataReconciled: true, restoredViewsIndependent: true, durationMs: Date.now() - started }));
  } finally {
    if (restoreAttempted) {
      await clearRestore(restored);
      if ((await restored.$queryRawUnsafe('SHOW FULL TABLES')).length) throw new Error('RESTORE_CLEANUP_INCOMPLETE');
    }
    if (user) {
      for (const name of ['transaction', 'budget', 'savingsGoal', 'asset', 'liability', 'category', 'account']) await p[name].deleteMany({ where: { userId: user.id } });
      await p.user.delete({ where: { id: user.id } });
    }
    await restored.$disconnect(); await p.$disconnect();
  }
}
main().catch((error) => { console.error(JSON.stringify({ event: 'restore_drill', outcome: 'failure', errorCode: /^[A-Z_]+$/.test(error.message) ? error.message : 'DRILL_FAILED' })); process.exitCode = 1; });
