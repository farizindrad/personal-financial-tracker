import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearTestData, createTestApp } from './helpers/fixture';

type Agent = ReturnType<typeof request.agent>;
type Row = { id: number; currentBalance?: string; amount?: string };
type Summary = {
  totalBalance: string;
  netWorth: string;
  expenseThisMonth: string;
};
type List<T> = {
  data: T[];
  meta: { total: number };
  summary?: { budgeted: string; spent: string; remaining: string };
};

describe('Financial API with an isolated MySQL database', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let owner: Agent;
  let other: Agent;
  const credentials = (email: string) => ({
    email,
    password: 'Fixture-only-password-2026',
  });
  const post = async (agent: Agent, path: string, body: object) =>
    (
      await agent
        .post('/api' + path)
        .send(body)
        .expect(201)
    ).body as Row;
  const get = async <T>(agent: Agent, path: string) =>
    (await agent.get('/api' + path).expect(200)).body as T;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => {
    await clearTestData(prisma);
    owner = request.agent(app.getHttpServer());
    other = request.agent(app.getHttpServer());
    await post(owner, '/auth/register', credentials('api-a@example.test'));
    await post(other, '/auth/register', credentials('api-b@example.test'));
  });
  afterAll(async () => {
    if (prisma) await clearTestData(prisma);
    if (app) await app.close();
  });

  it('reconciles income, expense, transfer, edits, deletion, budget, goals and net worth', async () => {
    const bank = await post(owner, '/accounts', {
      name: 'Bank',
      type: 'bank',
      initialBalance: 1000,
    });
    const cash = await post(owner, '/accounts', {
      name: 'Cash',
      type: 'cash',
      initialBalance: 0,
    });
    const food = await post(owner, '/categories', {
      name: 'Food',
      type: 'expense',
    });
    const salary = await post(owner, '/categories', {
      name: 'Salary',
      type: 'income',
    });
    await post(owner, '/budgets', {
      categoryId: food.id,
      month: 10,
      year: 2026,
      budgetAmount: 100,
    });
    await post(owner, '/savings-goals', {
      name: 'Reserve',
      targetAmount: 2000,
      accountId: bank.id,
    });
    await post(owner, '/assets', { name: 'Gold', value: 500 });
    await post(owner, '/liabilities', { name: 'Loan', amount: 100 });
    const base = { accountId: bank.id, transactionDate: '2026-10-15' };
    const income = await post(owner, '/transactions', {
      ...base,
      categoryId: salary.id,
      type: 'income',
      amount: 500,
    });
    const expense = await post(owner, '/transactions', {
      ...base,
      categoryId: food.id,
      type: 'expense',
      amount: 100,
    });
    await post(owner, '/transactions', {
      ...base,
      transferToAccountId: cash.id,
      type: 'transfer',
      amount: 200,
    });

    const accounts = await get<List<Row>>(owner, '/accounts');
    expect(
      Number(accounts.data.find((a) => a.id === bank.id)?.currentBalance),
    ).toBe(1200);
    expect(
      Number(accounts.data.find((a) => a.id === cash.id)?.currentBalance),
    ).toBe(200);
    const summary = await get<Summary>(
      owner,
      '/dashboard/summary?month=10&year=2026',
    );
    expect(Number(summary.totalBalance)).toBe(1400);
    expect(Number(summary.netWorth)).toBe(1800);
    expect(
      (await get<List<Row>>(owner, '/budgets?month=10&year=2026')).summary
        ?.spent,
    ).toBe('100.00');
    const goals = await get<
      List<{ currentAmount: string; percentComplete: number }>
    >(owner, '/savings-goals');
    expect(Number(goals.data[0].currentAmount)).toBe(1200);
    expect(goals.data[0].percentComplete).toBe(60);

    await owner
      .patch('/api/transactions/' + expense.id)
      .send({ amount: 150 })
      .expect(200);
    expect(
      (await get<List<Row>>(owner, '/budgets?month=10&year=2026')).summary
        ?.remaining,
    ).toBe('-50.00');
    await owner.delete('/api/transactions/' + expense.id).expect(204);
    await owner.delete('/api/transactions/' + expense.id).expect(404);
    expect(
      (await get<List<Row>>(owner, '/budgets?month=10&year=2026')).summary
        ?.spent,
    ).toBe('0.00');
    await owner.delete('/api/transactions/' + income.id).expect(204);
    expect(
      Number(
        (await get<Summary>(owner, '/dashboard/summary?month=10&year=2026'))
          .totalBalance,
      ),
    ).toBe(1000);
  });

  it('rejects unowned mutations and relations across every owned resource', async () => {
    const account = await post(owner, '/accounts', {
      name: 'Private',
      initialBalance: 1000,
    });
    const category = await post(owner, '/categories', {
      name: 'Private food',
      type: 'expense',
    });
    const transaction = await post(owner, '/transactions', {
      accountId: account.id,
      categoryId: category.id,
      type: 'expense',
      amount: 10,
      transactionDate: '2026-10-15',
    });
    const asset = await post(owner, '/assets', {
      name: 'Private asset',
      value: 50,
    });
    const liability = await post(owner, '/liabilities', {
      name: 'Private debt',
      amount: 5,
    });
    const goal = await post(owner, '/savings-goals', {
      name: 'Private goal',
      targetAmount: 2000,
      accountId: account.id,
    });
    const recurring = await post(owner, '/recurring-transactions', {
      accountId: account.id,
      categoryId: category.id,
      type: 'expense',
      amount: 10,
      frequency: 'monthly',
      startDate: '2026-10-15',
    });
    for (const [path, id] of [
      ['accounts', account.id],
      ['categories', category.id],
      ['transactions', transaction.id],
      ['assets', asset.id],
      ['liabilities', liability.id],
      ['savings-goals', goal.id],
      ['recurring-transactions', recurring.id],
    ] as const) {
      expect((await get<List<Row>>(other, '/' + path)).data).toEqual([]);
      await other
        .patch('/api/' + path + '/' + id)
        .send({})
        .expect(404);
    }
    await other.delete('/api/transactions/' + transaction.id).expect(404);
    await other
      .post('/api/transactions')
      .send({
        accountId: account.id,
        categoryId: category.id,
        type: 'expense',
        amount: 1,
        transactionDate: '2026-10-15',
      })
      .expect(400);
    await other
      .post('/api/savings-goals')
      .send({ accountId: account.id, name: 'Foreign', targetAmount: 1 })
      .expect(400);
    await other
      .post('/api/budgets')
      .send({ categoryId: category.id, month: 10, year: 2026, budgetAmount: 1 })
      .expect(400);
    expect(
      Number((await get<Summary>(owner, '/dashboard/summary')).totalBalance),
    ).toBe(990);
    const rejected = await request(app.getHttpServer())
      .get('/api/accounts')
      .expect(401);
    expect(rejected.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
    expect((rejected.body as { requestId: string }).requestId).toBe(
      rejected.headers['x-request-id'],
    );
  });
});
