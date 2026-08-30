import { BadRequestException, Injectable } from '@nestjs/common';
import { CategoryType, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: number,
    month: number,
    year: number,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const where = { userId, month, year };
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));

    // Budget list + realisasi groupBy paralel — join di memory, bukan loop query
    const [budgets, total, spentGroups] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        include: { category: true },
        orderBy: { id: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.budget.count({ where }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: TransactionType.expense,
          categoryId: { not: null },
          transactionDate: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    const spentByCategoryId = new Map(
      spentGroups
        .filter((g) => g.categoryId != null)
        .map((g) => [
          g.categoryId as number,
          g._sum.amount ?? new Prisma.Decimal(0),
        ]),
    );

    const data = budgets.map((budget) => {
      const spent =
        spentByCategoryId.get(budget.categoryId) ?? new Prisma.Decimal(0);
      const remaining = new Prisma.Decimal(budget.budgetAmount).minus(spent);
      return {
        ...budget,
        spent,
        remaining,
        percentUsed:
          Number(budget.budgetAmount) === 0
            ? 0
            : Number(
                new Prisma.Decimal(spent)
                  .div(budget.budgetAmount)
                  .mul(100)
                  .toFixed(2),
              ),
      };
    });

    return {
      data,
      meta: { total, page, limit, month, year },
    };
  }

  async upsert(userId: number, dto: UpsertBudgetDto) {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId, isActive: true },
    });
    if (!category) {
      throw new BadRequestException(
        `Category #${dto.categoryId} not found or inactive`,
      );
    }
    if (category.type !== CategoryType.expense) {
      throw new BadRequestException(
        'Budget only allowed for expense categories',
      );
    }

    return this.prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId,
          categoryId: dto.categoryId,
          month: dto.month,
          year: dto.year,
        },
      },
      create: {
        userId,
        categoryId: dto.categoryId,
        month: dto.month,
        year: dto.year,
        budgetAmount: dto.budgetAmount,
      },
      update: {
        budgetAmount: dto.budgetAmount,
      },
      include: { category: true },
    });
  }
}
