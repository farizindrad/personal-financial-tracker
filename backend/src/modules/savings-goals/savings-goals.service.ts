import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

@Injectable()
export class SavingsGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = { userId };

    const [goals, total] = await Promise.all([
      this.prisma.savingsGoal.findMany({
        where,
        include: { account: true },
        orderBy: { id: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.savingsGoal.count({ where }),
    ]);

    const accountIds = [
      ...new Set(
        goals.map((g) => g.accountId).filter((id): id is number => id != null),
      ),
    ];

    // Satu query saldo untuk semua akun terkait — anti N+1
    const balances =
      accountIds.length > 0
        ? await this.prisma.vAccountBalance.findMany({
            where: { accountId: { in: accountIds } },
          })
        : [];

    const balanceByAccountId = new Map(
      balances.map((b) => [b.accountId, b.currentBalance]),
    );

    const data = goals.map((goal) => {
      const currentAmount =
        goal.accountId != null
          ? (balanceByAccountId.get(goal.accountId) ?? new Prisma.Decimal(0))
          : new Prisma.Decimal(0);
      const remaining = Prisma.Decimal.max(
        new Prisma.Decimal(goal.targetAmount).minus(currentAmount),
        new Prisma.Decimal(0),
      );
      const percentComplete =
        Number(goal.targetAmount) === 0
          ? 0
          : Number(
              new Prisma.Decimal(currentAmount)
                .div(goal.targetAmount)
                .mul(100)
                .toFixed(2),
            );

      return {
        ...goal,
        currentAmount,
        remaining,
        percentComplete: Math.min(percentComplete, 100),
        isCompleted: new Prisma.Decimal(currentAmount).gte(goal.targetAmount),
      };
    });

    return { data, meta: { total, page, limit } };
  }

  async create(userId: number, dto: CreateSavingsGoalDto) {
    if (dto.accountId != null) {
      await this.assertActiveAccount(userId, dto.accountId);
    }

    const goal = await this.prisma.savingsGoal.create({
      data: {
        userId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        accountId: dto.accountId,
        notes: dto.notes,
      },
      include: { account: true },
    });

    return this.withProgress(goal);
  }

  async update(userId: number, id: number, dto: UpdateSavingsGoalDto) {
    const existing = await this.prisma.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Savings goal #${id} not found`);
    }

    if (dto.accountId !== undefined && dto.accountId !== null) {
      await this.assertActiveAccount(userId, dto.accountId);
    }

    const goal = await this.prisma.savingsGoal.update({
      where: { id },
      data: {
        name: dto.name,
        targetAmount: dto.targetAmount,
        targetDate:
          dto.targetDate === undefined
            ? undefined
            : dto.targetDate === null
              ? null
              : new Date(dto.targetDate),
        accountId: dto.accountId,
        notes: dto.notes,
      },
      include: { account: true },
    });

    return this.withProgress(goal);
  }

  private async assertActiveAccount(
    userId: number,
    accountId: number,
  ): Promise<void> {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, isActive: true },
      select: { id: true },
    });
    if (!account) {
      throw new BadRequestException(
        `Account #${accountId} not found or inactive`,
      );
    }
  }

  private async withProgress<
    T extends {
      accountId: number | null;
      targetAmount: Prisma.Decimal;
    },
  >(goal: T) {
    const currentAmount =
      goal.accountId != null
        ? ((
            await this.prisma.vAccountBalance.findUnique({
              where: { accountId: goal.accountId },
            })
          )?.currentBalance ?? new Prisma.Decimal(0))
        : new Prisma.Decimal(0);

    const remaining = Prisma.Decimal.max(
      new Prisma.Decimal(goal.targetAmount).minus(currentAmount),
      new Prisma.Decimal(0),
    );
    const percentComplete =
      Number(goal.targetAmount) === 0
        ? 0
        : Number(
            new Prisma.Decimal(currentAmount)
              .div(goal.targetAmount)
              .mul(100)
              .toFixed(2),
          );

    return {
      ...goal,
      currentAmount,
      remaining,
      percentComplete: Math.min(percentComplete, 100),
      isCompleted: new Prisma.Decimal(currentAmount).gte(goal.targetAmount),
    };
  }
}
