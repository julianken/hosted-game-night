import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

/**
 * Playwright configuration for Beak Gaming Platform E2E tests.
 *
 * Configured with projects for:
 * - Bingo app (port 3000)
 * - Trivia app (port 3001)
 * - Platform Hub (port 3002)
 *
 * In CI: Uses production servers (next start) since apps are pre-built
 * Locally: Uses dev servers (next dev) for hot reload during development
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  /* Use 4 workers on CI for parallel execution across shards */
  workers: isCI ? 4 : undefined,
  /* Configure sharding for CI to split tests across multiple jobs */
  shard: isCI && process.env.SHARD
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

  /**
   * Web server configuration:
   * - CI: Use production servers (next start) - apps are pre-built by workflow
   * - Local: Use dev servers (next dev) - supports hot reload
   *
   * Production servers start much faster (~2s vs ~30s each) since they don't
   * need to compile TypeScript/JSX on startup.
   */
  webServer: [
    {
      command: isCI ? 'pnpm --filter @beak-gaming/bingo start' : 'pnpm dev:bingo',
      url: 'http://localhost:3000',
      reuseExistingServer: !isCI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: isCI ? 'pnpm --filter @beak-gaming/trivia start' : 'pnpm dev:trivia',
      url: 'http://localhost:3001',
      reuseExistingServer: !isCI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: isCI ? 'pnpm --filter @beak-gaming/platform-hub start' : 'pnpm dev:hub',
      url: 'http://localhost:3002',
      reuseExistingServer: !isCI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
