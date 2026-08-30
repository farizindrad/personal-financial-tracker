import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { SavingsGoalsService } from './savings-goals.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SavingsGoalsService', () => {
  let service: SavingsGoalsService;
  const prisma = {
    savingsGoal: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    vAccountBalance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavingsGoalsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SavingsGoalsService);
  });

  it('findAll computes progress from one balance query (no per-goal query)', async () => {
    prisma.savingsGoal.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Dana darurat',
        targetAmount: new Prisma.Decimal(10_000_000),
        accountId: 1,
        account: { id: 1, name: 'BCA' },
      },
      {
        id: 2,
        name: 'Liburan',
        targetAmount: new Prisma.Decimal(5_000_000),
        accountId: null,
        account: null,
      },
    ]);
    prisma.savingsGoal.count.mockResolvedValue(2);
    prisma.vAccountBalance.findMany.mockResolvedValue([
      {
        accountId: 1,
        currentBalance: new Prisma.Decimal(2_500_000),
      },
    ]);

    const result = await service.findAll(1, 1, 50);

    expect(prisma.vAccountBalance.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.vAccountBalance.findMany).toHaveBeenCalledWith({
      where: { accountId: { in: [1] } },
    });
    expect(result.data[0].currentAmount).toEqual(new Prisma.Decimal(2_500_000));
    expect(result.data[0].percentComplete).toBe(25);
    expect(result.data[0].isCompleted).toBe(false);
    expect(result.data[1].currentAmount).toEqual(new Prisma.Decimal(0));
  });
});
