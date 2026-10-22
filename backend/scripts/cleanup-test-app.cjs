require('./test-database.cjs').loadTestEnvironment();
process.env.TS_NODE_PROJECT = require('path').join(__dirname, '../tsconfig.json');
require('ts-node/register');
const { clearTestData } = require('../test/helpers/fixture.ts');
const { PrismaService } = require('../src/prisma/prisma.service.ts');
const prisma = new PrismaService();
(async () => {
  try { await clearTestData(prisma); }
  finally { await prisma.$disconnect(); }
})().catch(() => { console.error('Isolated test fixture cleanup failed'); process.exitCode = 1; });
