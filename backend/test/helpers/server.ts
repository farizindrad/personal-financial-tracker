import { createTestApp, clearTestData } from './fixture';
import { PrismaService } from '../../src/prisma/prisma.service';

async function start() {
  const app = await createTestApp();
  const prisma = app.get(PrismaService);
  await clearTestData(prisma);
  await app.listen(3018, '127.0.0.1');
  const close = async () => {
    await clearTestData(prisma);
    await app.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => {
    void close();
  });
  process.once('SIGINT', () => {
    void close();
  });
  console.log('Isolated test API ready on localhost:3018');
}
void start();
