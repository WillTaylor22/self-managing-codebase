import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  // Picks up both `tests/e2e/*.spec.ts` and `tests/unit/*.spec.ts`.
  // Unit specs (e.g. extract-session-id) are pure-function tests that
  // simply don't touch the `page` fixture; they still run under the
  // chromium project but never spawn a browser context.
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'unit/**/*.spec.ts'],
  globalSetup: './tests/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
