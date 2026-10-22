function validateTestDatabase(env = process.env) {
  // This guard must run before loading AppModule or any environment fallback.
  if (env.ALLOW_TEST_DB_RESET !== 'true' || !env.TEST_DATABASE_URL) {
    throw new Error('Test database requires TEST_DATABASE_URL and ALLOW_TEST_DB_RESET=true');
  }
  let url;
  try { url = new URL(env.TEST_DATABASE_URL); } catch { throw new Error('Test database URL is invalid'); }
  if (url.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/ledger_test_[a-z0-9_]+$/.test(url.pathname)) {
    throw new Error('Test database must be local MySQL with a ledger_test_ schema');
  }
  return url;
}

function loadTestEnvironment() {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env.test'), quiet: true });
  validateTestDatabase();
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NODE_ENV = 'test';
  process.env.IS_DEMO = 'false';
  process.env.JWT_SECRET = 'isolated-integration-test-signing-key-not-for-deployment';
  process.env.COOKIE_SECURE = 'false';
  process.env.DEMO_EMAIL = 'demo-fixture@example.test';
  process.env.DEMO_PASSWORD = 'Fixture-only-password-2026';
  process.env.TRUST_PROXY_IPS = '';
}

module.exports = { validateTestDatabase, loadTestEnvironment };
