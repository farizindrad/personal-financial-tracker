const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { validateTestDatabase } = require('./test-database.cjs');
const { runMysql } = require('./mysql-tools.cjs');
const { checksum } = require('./backup-db.cjs');

async function restoreDatabase(file, env = process.env) {
  const started = Date.now();
  const target = env.RESTORE_TEST_DATABASE_URL;
  const url = validateTestDatabase({ TEST_DATABASE_URL: target, ALLOW_TEST_DB_RESET: env.ALLOW_TEST_DB_RESET });
  const source = env.TEST_DATABASE_URL || env.BACKUP_DATABASE_URL;
  if (source && new URL(source).pathname === url.pathname) throw new Error('RESTORE_SOURCE_EQUALS_TARGET');
  const info = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
  if (info.application !== 'ledger' || info.version !== 1 || info.sha256 !== await checksum(file)) throw new Error('BACKUP_CHECKSUM_INVALID');
  // This tool intentionally refuses production restores and nonempty targets.
  const p = new PrismaClient({ datasources: { db: { url: target } } });
  try {
    const rows = await p.$queryRawUnsafe('SHOW FULL TABLES');
    if (rows.length) throw new Error('RESTORE_TARGET_NOT_EMPTY');
    await runMysql('mysql', target, [], { input: file }, env);
    console.log(JSON.stringify({ event: 'database_restore', entryPoint: 'cli', outcome: 'success', runId: info.runId, durationMs: Date.now() - started }));
  } finally { await p.$disconnect(); }
}

if (require.main === module) restoreDatabase(process.argv[2]).catch(() => { console.error(JSON.stringify({ event: 'database_restore', outcome: 'failure', errorCode: 'RESTORE_FAILED' })); process.exitCode = 1; });
module.exports = { restoreDatabase };
