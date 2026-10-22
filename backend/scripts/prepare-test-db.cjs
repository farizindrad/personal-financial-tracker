const { loadTestEnvironment } = require('./test-database.cjs');
const { spawnSync } = require('child_process');
loadTestEnvironment();
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { stdio: 'inherit', env: process.env });
if (result.status !== 0) process.exit(result.status || 1);
if (process.env.RESTORE_TEST_DATABASE_URL) {
  const { PrismaClient } = require('@prisma/client');
  const { validateTestDatabase } = require('./test-database.cjs');
  const target = validateTestDatabase({ TEST_DATABASE_URL: process.env.RESTORE_TEST_DATABASE_URL, ALLOW_TEST_DB_RESET: process.env.ALLOW_TEST_DB_RESET });
  const source = new URL(process.env.TEST_DATABASE_URL);
  if (target.pathname === source.pathname || target.host !== source.host) throw new Error('Restore target must use a distinct schema on the same test server');
  const client = new PrismaClient();
  client.$executeRawUnsafe('CREATE DATABASE IF NOT EXISTS `' + target.pathname.slice(1) + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    .catch(() => { console.error('Unable to prepare dedicated restore schema'); process.exitCode = 1; })
    .finally(() => client.$disconnect());
}
