const fs = require('fs');
const path = require('path');
const { createHash, randomUUID } = require('crypto');
const { databaseConfig, runMysql } = require('./mysql-tools.cjs');

async function checksum(file) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function pruneBackups(directory, schema, days) {
  const cutoff = Date.now() - days * 86400000;
  for (const name of fs.readdirSync(directory)) {
    if (!name.startsWith('ledger-backup-' + schema + '-') || !name.endsWith('.sql')) continue;
    const file = path.join(directory, name), manifest = file + '.json';
    if (!fs.existsSync(manifest)) continue;
    const info = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (info.application === 'ledger' && info.schema === schema && Date.parse(info.createdAt) < cutoff) {
      fs.unlinkSync(file); fs.unlinkSync(manifest);
    }
  }
}

async function backupDatabase(env = process.env) {
  const started = Date.now();
  const url = databaseConfig(env.BACKUP_DATABASE_URL);
  const schema = url.pathname.slice(1);
  const days = Number(env.BACKUP_RETENTION_DAYS ?? '7');
  if (!env.BACKUP_DIR || !Number.isInteger(days) || days < 1 || days > 3650) throw new Error('BACKUP_CONFIG_INVALID');
  const directory = path.resolve(env.BACKUP_DIR);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const runId = randomUUID(), createdAt = new Date().toISOString();
  const file = path.join(directory, 'ledger-backup-' + schema + '-' + createdAt.replace(/[:.]/g, '-') + '-' + runId + '.sql');
  const partial = file + '.partial';
  try {
    await runMysql('mysqldump', env.BACKUP_DATABASE_URL,
      ['--single-transaction', '--quick', '--no-tablespaces', '--set-gtid-purged=OFF', '--routines', '--events', '--triggers', '--skip-add-locks'], { output: partial }, env);
    const sha256 = await checksum(partial);
    const info = { application: 'ledger', version: 1, runId, createdAt, schema, sha256, bytes: fs.statSync(partial).size };
    fs.linkSync(partial, file); fs.unlinkSync(partial);
    fs.writeFileSync(file + '.json', JSON.stringify(info, null, 2), { mode: 0o600, flag: 'wx' });
    pruneBackups(directory, schema, days);
    console.log(JSON.stringify({ event: 'database_backup', entryPoint: 'cli', runId, outcome: 'success', bytes: info.bytes, durationMs: Date.now() - started }));
    return file;
  } catch (error) {
    if (fs.existsSync(partial)) fs.unlinkSync(partial);
    throw error;
  }
}

if (require.main === module) backupDatabase().catch(() => { console.error(JSON.stringify({ event: 'database_backup', outcome: 'failure', errorCode: 'BACKUP_FAILED' })); process.exitCode = 1; });
module.exports = { backupDatabase, checksum, pruneBackups };
