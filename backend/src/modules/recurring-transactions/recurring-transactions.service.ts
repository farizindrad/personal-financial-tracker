import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryType,
  Prisma,
  RecurringFrequency,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';

const recurringInclude = {
  account: true,
  category: true,
} satisfies Prisma.RecurringTransactionInclude;

export type RecurringWithRelations = Prisma.RecurringTransactionGetPayload<{
  include: typeof recurringInclude;
}>;

@Injectable()
export class RecurringTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, page = 1, limit = 50, isActive?: boolean) {
    const skip = (page - 1) * limit;
    const where: Prisma.RecurringTransactionWhereInput = { userId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.recurringTransaction.findMany({
        where,
        include: recurringInclude,
        orderBy: [{ nextRunDate: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.recurringTransaction.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async create(
    userId: number,
    dto: CreateRecurringTransactionDto,
  ): Promise<RecurringWithRelations> {
    await this.assertRelations(userId, dto.accountId, dto.categoryId, dto.type);

    const startDate = new Date(dto.startDate);
    const nextRunDate = new Date(dto.nextRunDate ?? dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    return this.prisma.recurringTransaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        frequency: dto.frequency,
        startDate,
        endDate,
        nextRunDate,
      },
      include: recurringInclude,
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateRecurringTransactionDto,
  ): Promise<RecurringWithRelations> {
    const existing = await this.prisma.recurringTransaction.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Recurring transaction #${id} not found`);
    }

    const accountId = dto.accountId ?? existing.accountId;
    const categoryId =
      dto.categoryId !== undefined ? dto.categoryId : existing.categoryId;
    const type = dto.type ?? existing.type;

    if (categoryId == null) {
      throw new BadRequestException('categoryId is required');
    }

    await this.assertRelations(userId, accountId, categoryId, type);

    return this.prisma.recurringTransaction.update({
      where: { id },
      data: {
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        frequency: dto.frequency,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate:
          dto.endDate === undefined
            ? undefined
            : dto.endDate === null
              ? null
              : new Date(dto.endDate),
        nextRunDate: dto.nextRunDate ? new Date(dto.nextRunDate) : undefined,
        isActive: dto.isActive,
      },
      include: recurringInclude,
    });
  }

  /**
   * Proses semua template jatuh tempo: buat transaksi aktual + majukan next_run_date.
   * Dipanggil cron harian.
   */
  async processDue(today = this.startOfUtcDay(new Date())): Promise<number> {
    // Satu query semua due — pakai index idx_recurring_next_run
    const due = await this.prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        nextRunDate: { lte: today },
      },
      orderBy: { id: 'asc' },
    });

    let generated = 0;

    for (const template of due) {
      generated += await this.processOneTemplate(template, today);
    }

    return generated;
  }

  advanceNextRunDate(from: Date, frequency: RecurringFrequency): Date {
    const next = new Date(from);
    switch (frequency) {
      case RecurringFrequency.daily:
        next.setUTCDate(next.getUTCDate() + 1);
        break;
      case RecurringFrequency.weekly:
        next.setUTCDate(next.getUTCDate() + 7);
        break;
      case RecurringFrequency.monthly:
        next.setUTCMonth(next.getUTCMonth() + 1);
        break;
      case RecurringFrequency.yearly:
        next.setUTCFullYear(next.getUTCFullYear() + 1);
        break;
      default:
        next.setUTCDate(next.getUTCDate() + 1);
    }
    return this.startOfUtcDay(next);
  }

  private async processOneTemplate(
    template: {
      id: number;
      userId: number;
      accountId: number;
      categoryId: number | null;
      type: CategoryType;
      amount: Prisma.Decimal;
      description: string | null;
      frequency: RecurringFrequency;
      endDate: Date | null;
      nextRunDate: Date;
    },
    today: Date,
  ): Promise<number> {
    let nextRun = this.startOfUtcDay(template.nextRunDate);
    let count = 0;
    const maxCatchUp = 366; // safety: jangan infinite loop

    while (nextRun <= today && count < maxCatchUp) {
      if (template.endDate && nextRun > this.startOfUtcDay(template.endDate)) {
        await this.prisma.recurringTransaction.update({
          where: { id: template.id },
          data: { isActive: false, nextRunDate: nextRun },
        });
        return count;
      }

      if (template.categoryId == null) {
        break;
      }

      await this.prisma.$transaction([
        this.prisma.transaction.create({
          data: {
            userId: template.userId,
            accountId: template.accountId,
            categoryId: template.categoryId,
            type:
              template.type === CategoryType.income
                ? TransactionType.income
                : TransactionType.expense,
            amount: template.amount,
            transactionDate: nextRun,
            description: template.description,
          },
        }),
        this.prisma.recurringTransaction.update({
          where: { id: template.id },
          data: {
            nextRunDate: this.advanceNextRunDate(nextRun, template.frequency),
          },
        }),
      ]);

      nextRun = this.advanceNextRunDate(nextRun, template.frequency);
      count += 1;
    }

    if (template.endDate && nextRun > this.startOfUtcDay(template.endDate)) {
      await this.prisma.recurringTransaction.update({
        where: { id: template.id },
        data: { isActive: false },
      });
    }

    return count;
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private async assertRelations(
    userId: number,
    accountId: number,
    categoryId: number,
    type: CategoryType,
  ): Promise<void> {
    const [account, category] = await Promise.all([
      this.prisma.account.findFirst({
        where: { id: accountId, userId, isActive: true },
        select: { id: true },
      }),
      this.prisma.category.findFirst({
        where: { id: categoryId, userId, isActive: true },
        select: { id: true, type: true },
      }),
    ]);

    if (!account) {
      throw new BadRequestException(
        `Account #${accountId} not found or inactive`,
      );
    }
    if (!category) {
      throw new BadRequestException(
        `Category #${categoryId} not found or inactive`,
      );
    }
    if (category.type !== type) {
      throw new BadRequestException(
        `Category type must match recurring type (${type})`,
      );
    }
  }
}
