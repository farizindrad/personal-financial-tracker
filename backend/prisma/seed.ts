import { PrismaClient } from '@prisma/client';
import { seedDemoData } from '../src/seed/demo-seed';

const prisma = new PrismaClient();

async function main() {
  await seedDemoData(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
