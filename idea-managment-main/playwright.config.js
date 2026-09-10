const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium', channel: 'chrome', headless: true,
    viewport: { width: 1440, height: 1000 },
    locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    actionTimeout: 10000,
  },
  webServer: {
    command: 'node tests/e2e/server.cjs',
    url: 'http://127.0.0.1:4173/api/health',
    reuseExistingServer: false, timeout: 120000,
  },
});
