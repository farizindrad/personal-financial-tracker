import request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DemoResetScheduler } from '../src/scheduler/demo-reset.scheduler';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearTestData, createTestApp } from './helpers/fixture';
import * as demoSeed from '../src/seed/demo-seed';

describe('Rate limits and environment boundaries', () => {
  let app: NestExpressApplication | undefined;
  afterEach(async () => {
    if (app) {
      await clearTestData(app.get(PrismaService));
      await app.close();
      app = undefined;
    }
    process.env.IS_DEMO = 'false';
    delete process.env.TRUST_PROXY_IPS;
  });

  it('private writes use write limits instead of the auth limiter', async () => {
    app = await createTestApp(true);
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/register')
      .send({
        email: 'limits@example.test',
        password: 'Fixture-only-password-2026',
      })
      .expect(201);
    for (let i = 0; i < 11; i++)
      await agent
        .post('/api/accounts')
        .send({ name: 'Wallet ' + i })
        .expect(201);
  });

  it('demo login uses the stricter configured auth limit; registration stays forbidden', async () => {
    process.env.IS_DEMO = 'true';
    app = await createTestApp(true);
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'absent@example.test',
        password: 'Fixture-only-password-2026',
      })
      .expect(401);
    expect(response.headers['x-ratelimit-limit-auth']).toBe('5');
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'denied@example.test',
        password: 'Fixture-only-password-2026',
      })
      .expect(403);
  });

  it('forged forwarded IPs cannot evade limits when proxies are untrusted', async () => {
    process.env.IS_DEMO = 'true';
    app = await createTestApp(true);
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', `192.0.2.${i + 1}`)
        .send({
          email: 'absent@example.test',
          password: 'Fixture-only-password-2026',
        })
        .expect(i < 5 ? 401 : 429);
    }
    for (let i = 0; i < 8; i++)
      await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it('an explicitly trusted loopback proxy tracks distinct forwarded clients', async () => {
    process.env.IS_DEMO = 'true';
    process.env.TRUST_PROXY_IPS = '127.0.0.1,::1';
    app = await createTestApp(true);
    for (let i = 0; i < 6; i++)
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', `192.0.2.${i + 1}`)
        .send({
          email: 'absent@example.test',
          password: 'Fixture-only-password-2026',
        })
        .expect(401);
  });

  it('private mode cannot invoke a demo reset', async () => {
    const seed = jest.spyOn(demoSeed, 'seedDemoData');
    const prisma = { transaction: { deleteMany: jest.fn() } };
    const scheduler = new DemoResetScheduler(
      prisma as unknown as PrismaService,
      new ConfigService({ IS_DEMO: 'false' }),
    );
    await scheduler.handleDemoReset();
    expect(prisma.transaction.deleteMany).not.toHaveBeenCalled();
    expect(seed).not.toHaveBeenCalled();
    seed.mockRestore();
  });

  it('demo reseeding preserves unrelated private users and accounts', async () => {
    app = await createTestApp();
    const prisma = app.get(PrismaService);
    const user = await prisma.user.create({
      data: { email: 'private-fixture@example.test', passwordHash: 'unused' },
    });
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Preserve private fixture',
        initialBalance: 99,
      },
    });
    const scheduler = new DemoResetScheduler(
      prisma,
      new ConfigService({
        IS_DEMO: 'true',
        DEMO_EMAIL: 'scheduler-demo@example.test',
      }),
    );
    await scheduler.handleDemoReset();
    await scheduler.handleDemoReset();
    expect(
      await prisma.account.findUnique({ where: { id: account.id } }),
    ).toEqual(
      expect.objectContaining({
        userId: user.id,
        name: 'Preserve private fixture',
      }),
    );
    expect(
      await prisma.user.count({
        where: { email: 'scheduler-demo@example.test' },
      }),
    ).toBe(1);
  });
});
