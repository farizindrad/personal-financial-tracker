import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, TransactionType } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  const prisma = {
    $queryRaw: jest.fn(),
    transaction: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    asset: {
      aggregate: jest.fn(),
    },
    liability: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  it('getSummary runs balance + income + expense + recent in parallel', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { total: new Prisma.Decimal(5_800_000) },
    ]);
    prisma.transaction.aggregate
      .mockResolvedValueOnce({
        _sum: { amount: new Prisma.Decimal(1_000_000) },
      })
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(200_000) } });
    prisma.transaction.findMany.mockResolvedValue([
      {
        id: 1,
        type: TransactionType.expense,
        amount: new Prisma.Decimal(50_000),
      },
    ]);
    prisma.asset.aggregate.mockResolvedValue({
      _sum: { value: new Prisma.Decimal(10_000_000) },
    });
    prisma.liability.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(3_000_000) },
    });

    const result = await service.getSummary(1, 7, 2026);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(2);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        include: {
          account: true,
          category: true,
          transferToAccount: true,
        },
      }),
    );
    expect(result.period).toEqual({ month: 7, year: 2026 });
    expect(result.incomeThisMonth).toEqual(new Prisma.Decimal(1_000_000));
    expect(result.expenseThisMonth).toEqual(new Prisma.Decimal(200_000));
    expect(result.netThisMonth).toEqual(new Prisma.Decimal(800_000));
    expect(result.assetTotal).toEqual(new Prisma.Decimal(10_000_000));
    expect(result.liabilityTotal).toEqual(new Prisma.Decimal(3_000_000));
    expect(result.netWorth).toEqual(new Prisma.Decimal(12_800_000));
    expect(result.recentTransactions).toHaveLength(1);
  });

  it('getDaily returns every day of the month with zeros for empty days', async () => {
    prisma.transaction.groupBy
      .mockResolvedValueOnce([
        {
          transactionDate: new Date(Date.UTC(2026, 6, 5)),
          _sum: { amount: new Prisma.Decimal(500_000) },
        },
      ])
      .mockResolvedValueOnce([
        {
          transactionDate: new Date(Date.UTC(2026, 6, 5)),
          _sum: { amount: new Prisma.Decimal(120_000) },
        },
      ]);

    const result = await service.getDaily(1, 7, 2026);

    expect(result.data).toHaveLength(31);
    const day5 = result.data[4];
    expect(day5.income).toEqual(new Prisma.Decimal(500_000));
    expect(day5.expense).toEqual(new Prisma.Decimal(120_000));
    expect(day5.net).toEqual(new Prisma.Decimal(380_000));
    expect(result.data[0].net).toEqual(new Prisma.Decimal(0));
  });
});
