import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getStorageToken } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RecurringScheduler } from '../../src/scheduler/recurring.scheduler';
import { DemoResetScheduler } from '../../src/scheduler/demo-reset.scheduler';
import { validateTestDatabase } from '../../scripts/test-database.cjs';

export async function createTestApp(realThrottling = false) {
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(RecurringScheduler)
    .useValue({})
    .overrideProvider(DemoResetScheduler)
    .useValue({});
  if (!realThrottling) {
    builder.overrideProvider(getStorageToken()).useValue({
      increment: () =>
        Promise.resolve({
          totalHits: 1,
          timeToExpire: 1,
          isBlocked: false,
          timeToBlockExpire: 0,
        }),
    });
  }
  const module = await builder.compile();
  const app = module.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return app;
}

export async function clearTestData(prisma: PrismaService) {
  const expected = validateTestDatabase().pathname.slice(1);
  const actual = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT DATABASE() AS name`;
  if (actual[0]?.name !== expected)
    throw new Error(
      'Test database connection does not match the approved target',
    );
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.savingsGoal.deleteMany(),
    prisma.recurringTransaction.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.liability.deleteMany(),
    prisma.category.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
