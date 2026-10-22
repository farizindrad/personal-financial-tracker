const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateDeployment } = require('../scripts/check-deployment-isolation.cjs');
const privateEnv = { DATABASE_URL: 'mysql://private:fake@localhost/ledger_private', IS_DEMO: 'false' };
test('requires distinct schema names and correct modes even across host aliases', () => {
  assert.equal(validateDeployment(privateEnv, { DATABASE_URL: 'mysql://demo:fake@127.0.0.1/ledger_demo', IS_DEMO: 'true' }), true);
  assert.throws(() => validateDeployment(privateEnv, { DATABASE_URL: 'mysql://demo:fake@another-host/ledger_private', IS_DEMO: 'true' }), /SCHEMA_NAMES_MUST_DIFFER/);
  assert.throws(() => validateDeployment(privateEnv, { DATABASE_URL: 'mysql://demo:fake@localhost/ledger_demo', IS_DEMO: 'false' }), /MODE_INVALID/);
});
