import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { ListBudgetsQueryDto } from './dto/list-budgets-query.dto';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.decorators';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListBudgetsQueryDto) {
    return this.budgetsService.findAll(
      user.id,
      query.month,
      query.year,
      query.page ?? 1,
      query.limit ?? 50,
    );
  }

  @Post()
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertBudgetDto) {
    return this.budgetsService.upsert(user.id, dto);
  }
}
