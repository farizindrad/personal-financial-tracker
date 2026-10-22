import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringTransactionsService } from '../modules/recurring-transactions/recurring-transactions.service';
import { runScheduledJob } from './job-logging';

@Injectable()
export class RecurringScheduler {
  private readonly logger = new Logger(RecurringScheduler.name);

  constructor(
    private readonly recurringTransactionsService: RecurringTransactionsService,
  ) {}

  /** Cron harian in-process — generate transaksi saat next_run_date jatuh tempo */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDueRecurringTransactions() {
    await runScheduledJob(this.logger, 'recurring', () =>
      this.recurringTransactionsService.processDue(),
    );
  }
}
