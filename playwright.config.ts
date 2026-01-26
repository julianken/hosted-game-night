import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env file manually (Playwright doesn't auto-load it)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      process.env[key.trim()] = value.trim();
    }
  });
}

// Set E2E testing flag - this signals to Platform Hub to bypass Supabase auth
// and generate JWTs locally to avoid rate limits
process.env.E2E_TESTING = 'true';

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
  /* Global setup to validate test environment */
  globalSetup: './e2e/global-setup.ts',
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
    ['json', { outputFile: 'test-results/results.json' }],
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
        // Mobile viewports have slower auth navigation due to smaller viewport rendering
        // and potential auth redirect race conditions (BEA-375)
        navigationTimeout: 15000,
      },
    },
  ],

  /**
   * Web server configuration:
   * - CI: Use production servers (next start) - apps are pre-built by workflow
   * - Local: Disabled - assumes dev servers are manually started
   *
   * REASON: webServer with reuseExistingServer causes Playwright to hang
   * during initialization even when servers are already running. This appears
   * to be a Playwright bug with the health check logic. Manual server startup
   * works reliably.
   *
   * To run E2E tests locally:
   * 1. Start servers: pnpm dev (or pnpm dev:bingo, pnpm dev:hub separately)
   * 2. Run tests: pnpm test:e2e
   */
  webServer: isCI
    ? [
        {
          command: 'pnpm --filter @beak-gaming/bingo start',
          url: 'http://localhost:3000',
          reuseExistingServer: false,
          timeout: 120 * 1000,
          stdout: 'ignore',
          stderr: 'ignore',
          env: { E2E_TESTING: 'true' },
        },
        {
          command: 'pnpm --filter @beak-gaming/trivia start',
          url: 'http://localhost:3001',
          reuseExistingServer: false,
          timeout: 120 * 1000,
          stdout: 'ignore',
          stderr: 'ignore',
          env: { E2E_TESTING: 'true' },
        },
        {
          command: 'pnpm --filter @beak-gaming/platform-hub start',
          url: 'http://localhost:3002',
          reuseExistingServer: false,
          timeout: 120 * 1000,
          stdout: 'ignore',
          stderr: 'ignore',
          env: { E2E_TESTING: 'true' },
        },
      ]
    : undefined,
});
