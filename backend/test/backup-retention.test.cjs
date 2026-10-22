const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { pruneBackups } = require('../scripts/backup-db.cjs');

test('retention only removes expired Ledger backups for the current schema', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-retention-'));
  const old = path.join(dir, 'ledger-backup-ledger_test_one-old.sql');
  const other = path.join(dir, 'ledger-backup-ledger_test_other-old.sql');
  const recent = path.join(dir, 'ledger-backup-ledger_test_one-new.sql');
  for (const file of [old, other, recent]) {
    fs.writeFileSync(file, 'fixture');
    fs.writeFileSync(file + '.json', JSON.stringify({ application: 'ledger', schema: file === other ? 'ledger_test_other' : 'ledger_test_one', createdAt: file === recent ? new Date().toISOString() : '2000-01-01' }));
  }
  pruneBackups(dir, 'ledger_test_one', 7);
  assert.equal(fs.existsSync(old), false);
  assert.equal(fs.existsSync(other), true); assert.equal(fs.existsSync(recent), true);
  for (const file of [other, recent]) { fs.unlinkSync(file); fs.unlinkSync(file + '.json'); }
  fs.rmdirSync(dir);
});
