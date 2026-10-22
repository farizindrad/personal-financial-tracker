import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CategoryType, Prisma, TransactionType } from '@prisma/client';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BudgetsService', () => {
  let service: BudgetsService;
  const prisma = {
    budget: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      aggregate: jest.fn(),
    },
    transaction: {
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.budget.aggregate.mockResolvedValue({ _sum: { budgetAmount: null } });
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
    const module: TestingModule = await Test.createTestingModule({
      providers: [BudgetsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(BudgetsService);
  });

  it('findAll joins spent from groupBy in one pass (no per-budget query)', async () => {
    prisma.budget.findMany.mockResolvedValue([
      {
        id: 1,
        categoryId: 3,
        month: 7,
        year: 2026,
        budgetAmount: new Prisma.Decimal(1_000_000),
        category: { id: 3, name: 'Makanan', type: CategoryType.expense },
      },
    ]);
    prisma.budget.count.mockResolvedValue(1);
    prisma.transaction.groupBy.mockResolvedValue([
      {
        categoryId: 3,
        _sum: { amount: new Prisma.Decimal(250_000) },
      },
    ]);

    const result = await service.findAll(1, 7, 2026, 1, 50);

    expect(prisma.transaction.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['categoryId'],
        where: expect.objectContaining({
          type: TransactionType.expense,
        }) as unknown,
      }) as unknown,
    );
    expect(prisma.budget.findMany).toHaveBeenCalledTimes(1);
    expect(result.data[0].spent).toEqual(new Prisma.Decimal(250_000));
    expect(result.data[0].remaining).toEqual(new Prisma.Decimal(750_000));
    expect(result.data[0].percentUsed).toBe(25);
  });

  it('upsert rejects non-expense category', async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: 1,
      type: CategoryType.income,
      isActive: true,
    });

    await expect(
      service.upsert(1, {
        categoryId: 1,
        month: 7,
        year: 2026,
        budgetAmount: 500_000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the same full-period decimal totals on every page', async () => {
    prisma.budget.findMany.mockImplementation(({ skip }: { skip: number }) =>
      Promise.resolve([
        {
          id: skip + 1,
          categoryId: skip + 1,
          budgetAmount: new Prisma.Decimal('10.10'),
        },
      ]),
    );
    prisma.budget.count.mockResolvedValue(61);
    prisma.transaction.groupBy.mockResolvedValue([]);
    prisma.budget.aggregate.mockResolvedValue({
      _sum: { budgetAmount: new Prisma.Decimal('616.10') },
    });
    prisma.transaction.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('700.25') },
    });

    const first = await service.findAll(1, 10, 2026, 1, 20);
    const last = await service.findAll(1, 10, 2026, 4, 20);
    const expected = {
      budgeted: '616.10',
      spent: '700.25',
      remaining: '-84.15',
    };
    expect(first).toEqual(expect.objectContaining({ summary: expected }));
    expect(last).toEqual(expect.objectContaining({ summary: expected }));
    expect(prisma.budget.aggregate).toHaveBeenCalledWith({
      where: { userId: 1, month: 10, year: 2026 },
      _sum: { budgetAmount: true },
    });
    expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
      where: {
        userId: 1,
        type: TransactionType.expense,
        transactionDate: {
          gte: new Date('2026-10-01'),
          lte: new Date('2026-10-31'),
        },
        category: { budgets: { some: { userId: 1, month: 10, year: 2026 } } },
      },
      _sum: { amount: true },
    });
  });

  it('returns zero summary for an empty budget period', async () => {
    prisma.budget.findMany.mockResolvedValue([]);
    prisma.budget.count.mockResolvedValue(0);
    prisma.transaction.groupBy.mockResolvedValue([]);
    const result = await service.findAll(1, 10, 2026);
    expect(result).toEqual(
      expect.objectContaining({
        summary: { budgeted: '0.00', spent: '0.00', remaining: '0.00' },
      }),
    );
  });
});
