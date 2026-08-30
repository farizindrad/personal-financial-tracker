import { Test, TestingModule } from '@nestjs/testing';
import {
  CategoryType,
  Prisma,
  RecurringFrequency,
  TransactionType,
} from '@prisma/client';
import { RecurringTransactionsService } from './recurring-transactions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RecurringTransactionsService', () => {
  let service: RecurringTransactionsService;
  const prisma = {
    recurringTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTransactionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(RecurringTransactionsService);
  });

  it('advanceNextRunDate handles monthly/weekly', () => {
    const from = new Date(Date.UTC(2026, 6, 15)); // Jul 15
    expect(service.advanceNextRunDate(from, RecurringFrequency.weekly)).toEqual(
      new Date(Date.UTC(2026, 6, 22)),
    );
    expect(
      service.advanceNextRunDate(from, RecurringFrequency.monthly),
    ).toEqual(new Date(Date.UTC(2026, 7, 15)));
  });

  it('processDue loads due templates once then creates transactions', async () => {
    const today = new Date(Date.UTC(2026, 6, 27));
    prisma.recurringTransaction.findMany.mockResolvedValue([
      {
        id: 1,
        userId: 1,
        accountId: 1,
        categoryId: 3,
        type: CategoryType.expense,
        amount: new Prisma.Decimal(100_000),
        description: 'Netflix',
        frequency: RecurringFrequency.monthly,
        endDate: null,
        nextRunDate: new Date(Date.UTC(2026, 6, 27)),
      },
    ]);
    prisma.$transaction.mockImplementation((ops: unknown[]) =>
      Promise.resolve(ops),
    );
    prisma.transaction.create.mockReturnValue({ id: 'tx-op' });
    prisma.recurringTransaction.update.mockReturnValue({ id: 'upd-op' });

    const generated = await service.processDue(today);

    expect(prisma.recurringTransaction.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.recurringTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          nextRunDate: { lte: today },
        },
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          type: TransactionType.expense,
          amount: new Prisma.Decimal(100_000),
          categoryId: 3,
        }) as unknown,
      }) as unknown,
    );
    expect(generated).toBe(1);
  });
});
