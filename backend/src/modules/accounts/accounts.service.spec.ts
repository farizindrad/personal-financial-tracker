import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountType, Prisma } from '@prisma/client';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AccountsService', () => {
  let service: AccountsService;
  const prisma = {
    account: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    vAccountBalance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AccountsService);
  });

  it('findAll maps currentBalance from view in one pass (no per-row query)', async () => {
    prisma.account.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'BCA',
        type: AccountType.bank,
        initialBalance: new Prisma.Decimal(1000),
        isActive: true,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    prisma.account.count.mockResolvedValue(1);
    prisma.vAccountBalance.findMany.mockResolvedValue([
      {
        accountId: 1,
        accountName: 'BCA',
        accountType: AccountType.bank,
        currentBalance: new Prisma.Decimal(1500),
      },
    ]);

    const result = await service.findAll(1, 1, 50);

    expect(prisma.account.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.vAccountBalance.findMany).toHaveBeenCalledTimes(1);
    expect(result.data[0].currentBalance).toEqual(new Prisma.Decimal(1500));
    expect(result.meta.total).toBe(1);
  });

  it('remove soft-deletes active account', async () => {
    prisma.account.findFirst.mockResolvedValue({
      id: 2,
      name: 'Cash',
      isActive: true,
    });
    prisma.account.update.mockResolvedValue({
      id: 2,
      name: 'Cash',
      isActive: false,
    });

    await service.remove(1, 2);

    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { isActive: false },
    });
  });

  it('remove throws NotFound when account missing', async () => {
    prisma.account.findFirst.mockResolvedValue(null);
    await expect(service.remove(1, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
