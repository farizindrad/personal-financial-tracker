import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './integration',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:5179',
    channel: process.env.CI ? undefined : 'chrome',
    headless: true,
    timezoneId: 'UTC',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'node ../backend/scripts/serve-test-app.cjs', url: 'http://127.0.0.1:3018/api/health', reuseExistingServer: false, timeout: 120_000 },
    { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5179 --strictPort', url: 'http://127.0.0.1:5179', env: { VITE_TEST_API_TARGET: 'http://127.0.0.1:3018' }, reuseExistingServer: false },
  ],
});
