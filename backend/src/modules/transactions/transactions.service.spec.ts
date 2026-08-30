import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CategoryType, TransactionType } from '@prisma/client';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  const prisma = {
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TransactionsService);
  });

  it('findAll eager-loads account and category in one findMany', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);

    await service.findAll(1, 1, 20, { accountId: 1 });

    expect(prisma.transaction.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 1, accountId: 1 },
        include: {
          account: true,
          category: true,
          transferToAccount: true,
        },
        take: 20,
        skip: 0,
      }),
    );
  });

  it('create rejects transfer without transferToAccountId', async () => {
    await expect(
      service.create(1, {
        accountId: 1,
        type: TransactionType.transfer,
        amount: 100,
        transactionDate: '2026-07-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('create transfer validates accounts then persists', async () => {
    prisma.account.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.transaction.create.mockResolvedValue({
      id: 10,
      type: TransactionType.transfer,
      accountId: 1,
      transferToAccountId: 2,
      categoryId: null,
    });

    await service.create(1, {
      accountId: 1,
      type: TransactionType.transfer,
      amount: 50_000,
      transactionDate: '2026-07-01',
      transferToAccountId: 2,
      categoryId: 99,
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: null,
          transferToAccountId: 2,
          type: TransactionType.transfer,
        }) as unknown,
      }) as unknown,
    );
  });

  it('create income requires matching category type', async () => {
    prisma.account.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.category.findFirst.mockResolvedValue({
      id: 3,
      type: CategoryType.expense,
    });

    await expect(
      service.create(1, {
        accountId: 1,
        categoryId: 3,
        type: TransactionType.income,
        amount: 1000,
        transactionDate: '2026-07-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
