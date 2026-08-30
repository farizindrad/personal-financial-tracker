import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryType,
  Prisma,
  Transaction,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const transactionInclude = {
  account: true,
  category: true,
  transferToAccount: true,
} satisfies Prisma.TransactionInclude;

export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude;
}>;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: number,
    page = 1,
    limit = 20,
    filters: {
      dateFrom?: string;
      dateTo?: string;
      accountId?: number;
      categoryId?: number;
    } = {},
  ): Promise<{
    data: TransactionWithRelations[];
    meta: { total: number; page: number; limit: number };
  }> {
    const skip = (page - 1) * limit;
    const where: Prisma.TransactionWhereInput = { userId };

    if (filters.accountId != null) {
      where.accountId = filters.accountId;
    }
    if (filters.categoryId != null) {
      where.categoryId = filters.categoryId;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.transactionDate = {};
      if (filters.dateFrom) {
        where.transactionDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.transactionDate.lte = new Date(filters.dateTo);
      }
    }

    // Satu query list + include account/category — anti N+1; pakai index date/account/category
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: transactionInclude,
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async create(
    userId: number,
    dto: CreateTransactionDto,
  ): Promise<TransactionWithRelations> {
    const normalized = this.normalizePayload({
      accountId: dto.accountId,
      categoryId: dto.categoryId ?? null,
      type: dto.type,
      amount: dto.amount,
      transactionDate: dto.transactionDate,
      description: dto.description,
      transferToAccountId: dto.transferToAccountId ?? null,
    });

    await this.assertRelations(userId, normalized);

    return this.prisma.transaction.create({
      data: {
        userId,
        accountId: normalized.accountId,
        categoryId: normalized.categoryId,
        type: normalized.type,
        amount: normalized.amount,
        transactionDate: new Date(normalized.transactionDate),
        description: normalized.description,
        transferToAccountId: normalized.transferToAccountId,
      },
      include: transactionInclude,
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateTransactionDto,
  ): Promise<TransactionWithRelations> {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Transaction #${id} not found`);
    }

    const merged = this.normalizePayload({
      accountId: dto.accountId ?? existing.accountId,
      categoryId:
        dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
      type: dto.type ?? existing.type,
      amount: dto.amount !== undefined ? dto.amount : Number(existing.amount),
      transactionDate:
        dto.transactionDate ??
        existing.transactionDate.toISOString().slice(0, 10),
      description:
        dto.description !== undefined ? dto.description : existing.description,
      transferToAccountId:
        dto.transferToAccountId !== undefined
          ? dto.transferToAccountId
          : existing.transferToAccountId,
    });

    await this.assertRelations(userId, merged);

    return this.prisma.transaction.update({
      where: { id },
      data: {
        accountId: merged.accountId,
        categoryId: merged.categoryId,
        type: merged.type,
        amount: merged.amount,
        transactionDate: new Date(merged.transactionDate),
        description: merged.description,
        transferToAccountId: merged.transferToAccountId,
      },
      include: transactionInclude,
    });
  }

  async remove(userId: number, id: number): Promise<Transaction> {
    const result = await this.prisma.transaction.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Transaction #${id} not found`);
    }
    return this.prisma.transaction.findFirstOrThrow({
      where: { id, userId },
    });
  }

  private normalizePayload(input: {
    accountId: number;
    categoryId: number | null;
    type: TransactionType;
    amount: number;
    transactionDate: string;
    description?: string | null;
    transferToAccountId: number | null;
  }) {
    if (input.type === TransactionType.transfer) {
      if (input.transferToAccountId == null) {
        throw new BadRequestException(
          'transferToAccountId is required when type is transfer',
        );
      }
      if (input.transferToAccountId === input.accountId) {
        throw new BadRequestException(
          'transferToAccountId must differ from accountId',
        );
      }
      return { ...input, categoryId: null };
    }

    if (input.categoryId == null) {
      throw new BadRequestException(
        'categoryId is required when type is income or expense',
      );
    }
    if (input.transferToAccountId != null) {
      throw new BadRequestException(
        'transferToAccountId is only allowed when type is transfer',
      );
    }
    return { ...input, transferToAccountId: null };
  }

  private async assertRelations(
    userId: number,
    payload: {
      accountId: number;
      categoryId: number | null;
      type: TransactionType;
      transferToAccountId: number | null;
    },
  ): Promise<void> {
    const accountIds = [payload.accountId];
    if (payload.transferToAccountId != null) {
      accountIds.push(payload.transferToAccountId);
    }

    const [accounts, category] = await Promise.all([
      this.prisma.account.findMany({
        where: { id: { in: accountIds }, userId, isActive: true },
        select: { id: true },
      }),
      payload.categoryId != null
        ? this.prisma.category.findFirst({
            where: { id: payload.categoryId, userId, isActive: true },
            select: { id: true, type: true },
          })
        : Promise.resolve(null),
    ]);

    const foundIds = new Set(accounts.map((a) => a.id));
    if (!foundIds.has(payload.accountId)) {
      throw new BadRequestException(
        `Account #${payload.accountId} not found or inactive`,
      );
    }
    if (
      payload.transferToAccountId != null &&
      !foundIds.has(payload.transferToAccountId)
    ) {
      throw new BadRequestException(
        `Transfer target account #${payload.transferToAccountId} not found or inactive`,
      );
    }

    if (payload.type !== TransactionType.transfer) {
      if (!category) {
        throw new BadRequestException(
          `Category #${payload.categoryId} not found or inactive`,
        );
      }
      const expected =
        payload.type === TransactionType.income
          ? CategoryType.income
          : CategoryType.expense;
      if (category.type !== expected) {
        throw new BadRequestException(
          `Category type must be ${expected} for ${payload.type} transaction`,
        );
      }
    }
  }
}
