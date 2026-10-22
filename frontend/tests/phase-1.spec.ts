import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function fixture(page: Page, failingWidgets = false) {
  let owner = 1;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api', '');
    let body: unknown;
    if (path === '/auth/config') body = { demo: false, demoEmail: null };
    else if (path === '/auth/me') body = { user: { id: owner, name: `User ${owner}`, email: `user${owner}@example.test` } };
    else if (path === '/auth/logout') body = { ok: true };
    else if (path === '/auth/login') { owner = 2; body = { user: { id: 2, name: 'User 2', email: 'b@example.test' } }; }
    else if (failingWidgets && ['/budgets', '/savings-goals', '/dashboard/daily'].includes(path)) {
      return route.fulfill({ status: 503, json: { message: 'Fixture unavailable' } });
    } else if (path === '/dashboard/summary') body = {
      totalBalance: owner === 1 ? '1000' : '2000', incomeThisMonth: '1000', expenseThisMonth: '0', netThisMonth: '1000',
      netWorth: '1000', period: { month: 10, year: 2026 }, recentTransactions: [],
    };
    else if (path === '/dashboard/daily') body = { month: 10, year: 2026, data: [] };
    else if (path === '/accounts') body = { data: [{ id: owner, name: `Wallet ${owner}`, type: 'cash', initialBalance: '1000', currentBalance: '1000', isActive: true }], meta: { page: 1, limit: 100, total: 1 } };
    else if (path === '/budgets') {
      const current = Number(url.searchParams.get('page') ?? 1);
      body = { data: [{ id: current, categoryId: current, budgetAmount: '10', spent: '2', remaining: '8', percentUsed: 20, category: { id: current, name: `Category page ${current}`, type: 'expense' } }], meta: { page: current, limit: 20, total: 61, month: 10, year: 2026 }, summary: { budgeted: '610.00', spent: '122.00', remaining: '488.00' } };
    } else body = { data: [], meta: { total: 0, page: 1, limit: 100 } };
    await route.fulfill({ json: body });
  });
  return errors;
}

test('switching users never reuses the first user wallet', async ({ page }) => {
  const errors = await fixture(page);
  await page.goto('/accounts');
  await expect(page.getByText('Wallet 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Keluar' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email', { exact: true }).fill('b@example.test');
  await page.getByLabel('Kata sandi', { exact: true }).fill('password');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.getByRole('link', { name: 'Akun', exact: true }).first().click();
  await expect(page.getByText('Wallet 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Wallet 1', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('budget totals stay constant across list pages', async ({ page }) => {
  await fixture(page);
  await page.goto('/budgets');
  await expect(page.getByText('Category page 1', { exact: true })).toBeVisible();
  const remaining = page.locator('article').filter({ hasText: 'Sisa' }).first();
  await expect(remaining).toContainText('488');
  await page.getByRole('button', { name: /Selanjutnya|Berikutnya/ }).click();
  await expect(page.getByText('Category page 2', { exact: true })).toBeVisible();
  await expect(remaining).toContainText('488');
});

test('deleting a transaction closes the form and refreshes the list', async ({ page }) => {
  const errors = await fixture(page);
  let deleted = false;
  await page.route('**/api/transactions**', async (route) => {
    if (route.request().method() === 'DELETE') {
      deleted = true;
      return route.fulfill({ status: 204 });
    }
    await route.fulfill({ json: { data: deleted ? [] : [{ id: 1, type: 'expense', amount: '50', accountId: 1, categoryId: 1, description: 'Delete fixture', transactionDate: '2026-10-15', account: { id: 1, name: 'Wallet 1', type: 'cash' }, category: { id: 1, name: 'Food', type: 'expense' }, transferToAccount: null }], meta: { total: deleted ? 0 : 1, page: 1, limit: 20 } } });
  });
  await page.goto('/transactions');
  await page.getByRole('button', { name: /Delete fixture/ }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.getByRole('button', { name: /Delete fixture/ })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(deleted).toBe(true);
  expect(errors).toEqual([]);
});

test('dashboard widget failures show retry states, not empty financial data', async ({ page }) => {
  await fixture(page, true);
  await page.goto('/');
  await expect(page.getByText('Gagal memuat anggaran.')).toBeVisible();
  await expect(page.getByText('Gagal memuat target tabungan.')).toBeVisible();
  await expect(page.getByText('Gagal memuat kalender.')).toBeVisible();
  await expect(page.getByText('Belum ada anggaran bulan ini.')).toHaveCount(0);
  await expect(page.getByText('Belum ada target tabungan.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Coba lagi' })).toHaveCount(3);
});

test('dashboard calendar preserves the chosen day and weekday alignment', async ({ page }) => {
  await fixture(page);
  await page.goto('/');
  const day = page.locator('a[href="/transactions?view=calendar&date=2026-10-15"]');
  await expect(day).toBeVisible();
  await expect(page.getByText('Kam', { exact: true })).toBeVisible();
  await day.click();
  await expect(page).toHaveURL(/date=2026-10-15/);
  await expect(page.getByText('15 Okt 2026', { exact: true })).toBeVisible();
});

test('mobile dashboard remains usable', async ({ page }, testInfo) => {
  const errors = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Saldo/ })).toBeVisible();
  await page.getByRole('button', { name: 'Buka menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile-dashboard.png'), fullPage: true });
  expect(errors).toEqual([]);
});
