import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { SavingsGoalsModule } from './modules/savings-goals/savings-goals.module';
import { RecurringTransactionsModule } from './modules/recurring-transactions/recurring-transactions.module';
import { AssetsModule } from './modules/assets/assets.module';
import { LiabilitiesModule } from './modules/liabilities/liabilities.module';
import { RecurringScheduler } from './scheduler/recurring.scheduler';
import { DemoResetScheduler } from './scheduler/demo-reset.scheduler';
import { serveStaticModules } from './static/serve-static.config';
import { createThrottlerOptions } from './common/throttler.config';
import { WriteThrottlerGuard } from './common/guards/write-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createThrottlerOptions(config),
    }),
    ScheduleModule.forRoot(),
    ...serveStaticModules(),
    PrismaModule,
    AuthModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    DashboardModule,
    BudgetsModule,
    SavingsGoalsModule,
    RecurringTransactionsModule,
    AssetsModule,
    LiabilitiesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RecurringScheduler,
    DemoResetScheduler,
    {
      provide: APP_GUARD,
      useClass: WriteThrottlerGuard,
    },
  ],
})
export class AppModule {}
