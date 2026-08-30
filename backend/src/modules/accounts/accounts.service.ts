import { Injectable, NotFoundException } from '@nestjs/common';
import { Account, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

export type AccountWithBalance = Account & {
  currentBalance: Prisma.Decimal;
};

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: number,
    page = 1,
    limit = 50,
  ): Promise<{
    data: AccountWithBalance[];
    meta: { total: number; page: number; limit: number };
  }> {
    const skip = (page - 1) * limit;
    const where = { userId, isActive: true };

    // 2 query paralel — bukan loop per akun (anti N+1)
    const [accounts, total, balances] = await Promise.all([
      this.prisma.account.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.account.count({ where }),
      this.prisma.vAccountBalance.findMany({
        where: { userId },
      }),
    ]);

    const balanceById = new Map(
      balances.map((b) => [b.accountId, b.currentBalance]),
    );

    const data: AccountWithBalance[] = accounts.map((account) => ({
      ...account,
      currentBalance: balanceById.get(account.id) ?? account.initialBalance,
    }));

    return { data, meta: { total, page, limit } };
  }

  async create(
    userId: number,
    dto: CreateAccountDto,
  ): Promise<AccountWithBalance> {
    const account = await this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        initialBalance: dto.initialBalance ?? 0,
        notes: dto.notes,
      },
    });

    const balance = await this.prisma.vAccountBalance.findUnique({
      where: { accountId: account.id },
    });

    return {
      ...account,
      currentBalance: balance?.currentBalance ?? account.initialBalance,
    };
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateAccountDto,
  ): Promise<AccountWithBalance> {
    await this.ensureActiveAccount(userId, id);

    const account = await this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        initialBalance: dto.initialBalance,
        notes: dto.notes,
      },
    });

    const balance = await this.prisma.vAccountBalance.findUnique({
      where: { accountId: account.id },
    });

    return {
      ...account,
      currentBalance: balance?.currentBalance ?? account.initialBalance,
    };
  }

  /** Soft delete: set is_active = false */
  async remove(userId: number, id: number): Promise<Account> {
    await this.ensureActiveAccount(userId, id);

    return this.prisma.account.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async ensureActiveAccount(
    userId: number,
    id: number,
  ): Promise<Account> {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, isActive: true },
    });
    if (!account) {
      throw new NotFoundException(`Account #${id} not found`);
    }
    return account;
  }
}
