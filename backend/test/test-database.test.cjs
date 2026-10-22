const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateTestDatabase } = require('../scripts/test-database.cjs');

test('only accepts an explicitly opted-in local disposable database', () => {
  assert.equal(validateTestDatabase({ TEST_DATABASE_URL: 'mysql://test:fake@127.0.0.1:3306/ledger_test_ci', ALLOW_TEST_DB_RESET: 'true' }).pathname, '/ledger_test_ci');
});

for (const [name, env] of [
  ['missing dedicated URL', { DATABASE_URL: 'mysql://root:fake@localhost/private', ALLOW_TEST_DB_RESET: 'true' }],
  ['missing opt in', { TEST_DATABASE_URL: 'mysql://test:fake@localhost/ledger_test_ci' }],
  ['private schema', { TEST_DATABASE_URL: 'mysql://test:fake@localhost/personal_finance', ALLOW_TEST_DB_RESET: 'true' }],
  ['remote server', { TEST_DATABASE_URL: 'mysql://test:fake@db.example.test/ledger_test_ci', ALLOW_TEST_DB_RESET: 'true' }],
  ['encoded schema', { TEST_DATABASE_URL: 'mysql://test:fake@localhost/ledger_test_ci%2Fprivate', ALLOW_TEST_DB_RESET: 'true' }],
]) {
  test(`refuses ${name} without exposing credentials`, () => {
    assert.throws(() => validateTestDatabase(env), (error) => !error.message.includes('fake') && error.message.includes('Test database'));
  });
}
