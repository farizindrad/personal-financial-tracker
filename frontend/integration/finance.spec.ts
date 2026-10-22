import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Kata sandi', { exact: true }).fill('Fixture-only-password-2026');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keluar' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
}

async function users(page: Page) {
  const id = randomUUID();
  const a = `browser-a-${id}@example.test`, b = `browser-b-${id}@example.test`;
  for (const email of [a, b]) {
    const response = await page.request.post('/api/auth/register', { data: { email, password: 'Fixture-only-password-2026' } });
    expect(response.status()).toBe(201);
  }
  await page.request.post('/api/accounts', { data: { name: 'B private wallet', initialBalance: 2222 } });
  await page.request.post('/api/auth/logout');
  return { a, b };
}

test('real account entry and transaction mutations reconcile cached dashboard, budget and goals', async ({ page }) => {
  const { a } = await users(page);
  await login(page, a);
  await page.getByRole('link', { name: 'Akun', exact: true }).first().click();
  await page.getByRole('button', { name: 'Tambah akun', exact: true }).click();
  await page.getByLabel('Nama', { exact: true }).fill('A wallet');
  await page.getByLabel('Saldo awal', { exact: true }).fill('500');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByText('A wallet', { exact: true })).toBeVisible();
  const accounts = await (await page.request.get('/api/accounts')).json() as { data: { id: number }[] };
  const accountId = accounts.data[0].id;
  const catResponse = await page.request.post('/api/categories', { data: { name: 'Food', type: 'expense' } });
  const category = await catResponse.json() as { id: number };
  const now = new Date();
  expect((await page.request.post('/api/budgets', { data: { categoryId: category.id, month: now.getUTCMonth() + 1, year: now.getUTCFullYear(), budgetAmount: 100 } })).status()).toBe(201);
  expect((await page.request.post('/api/savings-goals', { data: { name: 'Reserve', targetAmount: 1000, accountId } })).status()).toBe(201);
  await page.getByRole('link', { name: 'Anggaran', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Food', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Target tabungan', exact: true }).first().click();
  await expect(page.getByText('Reserve', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Transaksi', exact: true }).first().click();
  await page.getByRole('button', { name: 'Catat transaksi', exact: true }).first().click();
  await page.getByRole('combobox', { name: 'Akun', exact: true }).selectOption(String(accountId));
  await page.getByRole('combobox', { name: 'Kategori', exact: true }).selectOption(String(category.id));
  await page.getByLabel('Nominal', { exact: true }).fill('50');
  await page.getByLabel('Catatan (opsional)', { exact: true }).fill('Live database expense');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Ringkasan', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /Saldo/ })).toContainText('450');
  await page.getByRole('link', { name: 'Anggaran', exact: true }).first().click();
  await expect(page.locator('p').filter({ hasText: /^Sisa Rp\s*50$/ })).toBeVisible();
  await page.getByRole('link', { name: 'Target tabungan', exact: true }).first().click();
  await expect(page.getByText(/45%/).first()).toBeVisible();
  await page.getByRole('link', { name: 'Transaksi', exact: true }).first().click();
  await page.getByRole('button', { name: /Live database expense/ }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Ringkasan', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /Saldo/ })).toContainText('500');
});

test('a delayed real response from A cannot replace B financial data', async ({ page }) => {
  const { a, b } = await users(page);
  await login(page, a);
  await page.request.post('/api/accounts', { data: { name: 'A delayed wallet', initialBalance: 1111 } });
  let release!: () => void;
  let captured!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { captured = resolve; });
  let held = false;
  await page.route('**/api/accounts?*', async (route) => {
    if (held) return route.continue();
    held = true;
    const response = await route.fetch();
    captured();
    await gate;
    await route.fulfill({ response }).catch(() => undefined);
  });
  await page.getByRole('link', { name: 'Akun', exact: true }).first().click();
  await ready;
  await page.getByRole('button', { name: 'Keluar' }).click();
  await expect(page).toHaveURL(/login/);
  await login(page, b);
  await page.getByRole('link', { name: 'Akun', exact: true }).first().click();
  await expect(page.getByText('B private wallet', { exact: true })).toBeVisible();
  release();
  await expect(page.getByText('A delayed wallet', { exact: true })).toHaveCount(0);
  const accounts = await (await page.request.get('/api/accounts')).json() as { data: { name: string }[] };
  expect(accounts.data.map((row) => row.name)).toEqual(['B private wallet']);
});
