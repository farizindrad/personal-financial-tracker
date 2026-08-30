import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RecurringTransactionsService } from './recurring-transactions.service';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
import { ListRecurringTransactionsQueryDto } from './dto/list-recurring-transactions-query.dto';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.decorators';

@Controller('recurring-transactions')
export class RecurringTransactionsController {
  constructor(
    private readonly recurringTransactionsService: RecurringTransactionsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListRecurringTransactionsQueryDto,
  ) {
    return this.recurringTransactionsService.findAll(
      user.id,
      query.page ?? 1,
      query.limit ?? 50,
      query.isActive,
    );
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRecurringTransactionDto,
  ) {
    return this.recurringTransactionsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecurringTransactionDto,
  ) {
    return this.recurringTransactionsService.update(user.id, id, dto);
  }
}
