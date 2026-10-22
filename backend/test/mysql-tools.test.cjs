const { test } = require('node:test');
const assert = require('node:assert/strict');
const { databaseConfig, quoteOption } = require('../scripts/mysql-tools.cjs');

test('quotes credentials without introducing option-file directives', () => {
  assert.equal(quoteOption('a"b\\c\npassword=secret'), '"a\\"b\\\\c\\npassword=secret"');
});
test('rejects unsafe schema names without echoing credentials', () => {
  assert.throws(() => databaseConfig('mysql://user:secret@localhost/private%3Bdrop'), /^Error: MYSQL_CONFIG_INVALID$/);
});
