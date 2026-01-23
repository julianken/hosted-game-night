import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Beak Gaming Platform E2E tests.
 *
 * Configured with projects for:
 * - Bingo app (port 3000)
 * - Trivia app (port 3001)
 * - Platform Hub (port 3002)
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use 4 workers on CI for parallel execution across shards */
  workers: process.env.CI ? 4 : undefined,
  /* Configure sharding for CI to split tests across multiple jobs */
  shard: process.env.CI && process.env.SHARD
    ? { total: 4, current: parseInt(process.env.SHARD, 10) }
    : undefined,
  /* Reporter to use */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  /* Shared settings for all the projects below */
  use: {
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on first retry */
    video: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'bingo',
      testDir: './e2e/bingo',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
        /* Viewport optimized for testing senior-friendly UI */
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'trivia',
      testDir: './e2e/trivia',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'platform-hub',
      testDir: './e2e/platform-hub',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
        viewport: { width: 1280, height: 720 },
      },
    },
    /* Mobile testing for accessibility (optional) */
    {
      name: 'bingo-mobile',
      testDir: './e2e/bingo',
      testMatch: ['**/home.spec.ts', '**/accessibility.spec.ts'],
      use: {
        ...devices['iPhone 13'],
        baseURL: 'http://localhost:3000',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'pnpm dev:bingo',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm dev:trivia',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm dev:hub',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
