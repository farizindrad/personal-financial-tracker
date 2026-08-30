import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const recentInclude = {
  account: true,
  category: true,
  transferToAccount: true,
} satisfies Prisma.TransactionInclude;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: number, month?: number, year?: number) {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1; // 1-12

    const periodStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(targetYear, targetMonth, 0)); // last day of month

    // Semua agregasi paralel — 1 response, bukan N+1 / banyak round-trip FE
    const [totalBalanceRows, incomeAgg, expenseAgg, recentTransactions] =
      await Promise.all([
        this.prisma.$queryRaw<Array<{ total: Prisma.Decimal | number | null }>>`
          SELECT COALESCE(SUM(v.current_balance), 0) AS total
          FROM v_account_balances v
          INNER JOIN accounts a ON a.id = v.account_id
          WHERE a.is_active = true AND a.user_id = ${userId}
        `,
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: TransactionType.income,
            transactionDate: { gte: periodStart, lte: periodEnd },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: TransactionType.expense,
            transactionDate: { gte: periodStart, lte: periodEnd },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.findMany({
          where: { userId },
          take: 10,
          orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
          include: recentInclude,
        }),
      ]);

    const incomeThisMonth = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
    const expenseThisMonth = expenseAgg._sum.amount ?? new Prisma.Decimal(0);
    const totalBalance = totalBalanceRows[0]?.total ?? 0;

    const [assetTotal, liabilityTotal] = await Promise.all([
      this.prisma.asset.aggregate({
        where: { userId },
        _sum: { value: true },
      }),
      this.prisma.liability.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    const assets = assetTotal._sum.value ?? new Prisma.Decimal(0);
    const liabilities = liabilityTotal._sum.amount ?? new Prisma.Decimal(0);
    const netWorth = new Prisma.Decimal(Number(totalBalance) || 0)
      .plus(assets)
      .minus(liabilities);

    return {
      totalBalance,
      incomeThisMonth,
      expenseThisMonth,
      netThisMonth: new Prisma.Decimal(incomeThisMonth).minus(expenseThisMonth),
      assetTotal: assets,
      liabilityTotal: liabilities,
      netWorth,
      period: { month: targetMonth, year: targetYear },
      recentTransactions,
    };
  }

  async getDaily(userId: number, month?: number, year?: number) {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1; // 1-12

    const periodStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(targetYear, targetMonth, 0)); // last day of month

    const [incomeGroups, expenseGroups] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['transactionDate'],
        where: {
          userId,
          type: TransactionType.income,
          transactionDate: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['transactionDate'],
        where: {
          userId,
          type: TransactionType.expense,
          transactionDate: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    const incomeByDay = new Map(
      incomeGroups.map((g) => [
        this.dateKey(g.transactionDate),
        g._sum.amount ?? new Prisma.Decimal(0),
      ]),
    );
    const expenseByDay = new Map(
      expenseGroups.map((g) => [
        this.dateKey(g.transactionDate),
        g._sum.amount ?? new Prisma.Decimal(0),
      ]),
    );

    const daysInMonth = new Date(
      Date.UTC(targetYear, targetMonth, 0),
    ).getUTCDate();
    const data: Array<{
      date: string;
      income: Prisma.Decimal;
      expense: Prisma.Decimal;
      net: Prisma.Decimal;
    }> = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const income = incomeByDay.get(key) ?? new Prisma.Decimal(0);
      const expense = expenseByDay.get(key) ?? new Prisma.Decimal(0);
      data.push({
        date: key,
        income,
        expense,
        net: new Prisma.Decimal(income).minus(expense),
      });
    }

    return { month: targetMonth, year: targetYear, data };
  }

  private dateKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }
}
