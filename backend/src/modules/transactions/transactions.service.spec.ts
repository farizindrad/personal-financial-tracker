import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  it('deletes an owned row successfully without trying to read it afterwards', async () => {
    const rows = [
      { id: 10, userId: 1 },
      { id: 20, userId: 2 },
    ];
    prisma.transaction.deleteMany.mockImplementation(
      ({ where }: { where: { id: number; userId: number } }) => {
        const index = rows.findIndex(
          (row) => row.id === where.id && row.userId === where.userId,
        );
        if (index < 0) return Promise.resolve({ count: 0 });
        rows.splice(index, 1);
        return Promise.resolve({ count: 1 });
      },
    );
    prisma.transaction.findFirstOrThrow.mockRejectedValue(
      new Error('Deleted records cannot be read'),
    );

    await expect(service.remove(1, 10)).resolves.toBeUndefined();
    expect(rows).toEqual([{ id: 20, userId: 2 }]);
  });

  it.each([10, 20])(
    'returns not-found for a missing or unowned row (%i)',
    async (id) => {
      prisma.transaction.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.remove(1, id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: { id, userId: 1 },
      });
    },
  );
});
