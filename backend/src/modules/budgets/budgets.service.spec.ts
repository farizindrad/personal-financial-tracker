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
    },
    transaction: {
      groupBy: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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
});
