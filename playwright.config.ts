import { defineConfig, devices } from '@playwright/test';
import { getE2EPortConfig } from './e2e/utils/port-config';

// Set E2E testing flag.
// This signals to apps to use E2E bypass mode (local JWT generation, no Supabase).
process.env.E2E_TESTING ??= 'true';

const isCI = !!process.env.CI;

// -----------------------------------------------------------------------------
// Dynamic Port Configuration for Worktree Isolation
// -----------------------------------------------------------------------------
// Port config is shared across playwright.config.ts, global-setup.ts, and
// auth fixtures via e2e/utils/port-config.ts (single source of truth).
//
// How it works:
// 1. Main repo uses default ports: 3000 (bingo), 3001 (trivia)
// 2. Worktrees use hash-based port offsets derived from their path
// 3. Environment variables can override: E2E_PORT_BASE, E2E_*_PORT
//
// See e2e/utils/port-config.ts for the full implementation.
// -----------------------------------------------------------------------------

// Get port configuration for this environment
const portConfig = getE2EPortConfig();

// Log port configuration for debugging
console.log('[Playwright Config] E2E Port Configuration:');
console.log(`  Source: ${portConfig.source}`);
console.log(`  Is Worktree: ${portConfig.isWorktree}`);
if (portConfig.isWorktree) {
  console.log(`  Worktree Path: ${portConfig.repoPath}`);
}
console.log(`  Bingo: http://localhost:${portConfig.bingoPort}`);
console.log(`  Trivia: http://localhost:${portConfig.triviaPort}`);

// Export port config for use in fixtures and tests
export { portConfig };

/**
 * Playwright configuration for Hosted Game Night E2E tests.
 *
 * Configured with projects for:
 * - Bingo app (dynamic port, default 3000)
 * - Trivia app (dynamic port, default 3001)
 *
 * Port Isolation:
 * - Main repo uses default ports (3000, 3001)
 * - Worktrees use hash-based port offsets for parallel testing
 * - Environment variables can override: E2E_PORT_BASE, E2E_*_PORT
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
  /* Retry failed tests to handle transient infrastructure issues */
  retries: isCI ? 2 : 1,
  /* 4 workers both CI and local. Measured 1.84x speedup from 2->4 local on
     M3 Pro; CPU peaked at ~30% with ~20 chrome processes — headroom remains.
     CI (GitHub Actions ubuntu-latest) already used 4 per shard. */
  workers: 4,
  /* Increase timeout to handle production build startup and server load */
  timeout: 60000,
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
        baseURL: `http://localhost:${portConfig.bingoPort}`,
        /* Viewport optimized for testing accessible UI */
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'trivia',
      testDir: './e2e/trivia',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${portConfig.triviaPort}`,
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  /**
   * Web server configuration:
   * - CI: Use production servers (next start) - apps are pre-built by workflow
   * - Local: Disabled - assumes dev servers are manually started
   *
   * To run E2E tests locally:
   * 1. Start servers: pnpm dev (or with port overrides for worktrees)
   * 2. Run tests: pnpm test:e2e
   *
   * For worktree isolation:
   * 1. Run: ./scripts/setup-worktree-e2e.sh
   * 2. Start servers with PORT environment variables
   * 3. Run tests: pnpm test:e2e
   */
  webServer: isCI
    ? [
        {
          command: 'pnpm --filter @hosted-game-night/bingo start',
          url: `http://localhost:${portConfig.bingoPort}`,
          reuseExistingServer: false,
          timeout: 120 * 1000,
          stdout: 'ignore',
          stderr: 'ignore',
          env: { E2E_TESTING: 'true', PORT: String(portConfig.bingoPort) },
        },
        {
          command: 'pnpm --filter @hosted-game-night/trivia start',
          url: `http://localhost:${portConfig.triviaPort}`,
          reuseExistingServer: false,
          timeout: 120 * 1000,
          stdout: 'ignore',
          stderr: 'ignore',
          env: { E2E_TESTING: 'true', PORT: String(portConfig.triviaPort) },
        },
      ]
    : undefined,
});
