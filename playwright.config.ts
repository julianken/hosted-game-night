import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getE2EPortConfig } from './e2e/utils/port-config';

// Load .env file manually (Playwright doesn't auto-load it)
// Respects existing env vars — runner scripts (e.g., e2e-real-auth.sh) can
// export values that take precedence over the .env file.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      const trimmedKey = key.trim();
      // Don't overwrite env vars already set (e.g., by e2e-real-auth.sh)
      if (process.env[trimmedKey] === undefined) {
        process.env[trimmedKey] = value.trim();
      }
    }
  });
}

// Set E2E testing flag unless explicitly disabled (e.g., for real-auth tests).
// This signals to Platform Hub to bypass Supabase auth and generate JWTs locally.
process.env.E2E_TESTING ??= 'true';

const isCI = !!process.env.CI;

// -----------------------------------------------------------------------------
// Dynamic Port Configuration for Worktree Isolation
// -----------------------------------------------------------------------------
// Port config is shared across playwright.config.ts, global-setup.ts, and
// auth fixtures via e2e/utils/port-config.ts (single source of truth).
//
// How it works:
// 1. Main repo uses default ports: 3000 (bingo), 3001 (trivia), 3002 (hub)
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
console.log(`  Hub: http://localhost:${portConfig.hubPort}`);

// Export port config for use in fixtures and tests
export { portConfig };

/**
 * Playwright configuration for Beak Gaming Platform E2E tests.
 *
 * Configured with projects for:
 * - Bingo app (dynamic port, default 3000)
 * - Trivia app (dynamic port, default 3001)
 * - Platform Hub (dynamic port, default 3002)
 *
 * Port Isolation:
 * - Main repo uses default ports (3000, 3001, 3002)
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
  /* Reduce workers to prevent server overload (was: 4 on CI, unlimited locally) */
  workers: isCI ? 4 : 2,
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
        /* Viewport optimized for testing senior-friendly UI */
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
    {
      name: 'platform-hub',
      testDir: './e2e/platform-hub',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${portConfig.hubPort}`,
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
        baseURL: `http://localhost:${portConfig.bingoPort}`,
        // Mobile viewports have slower auth navigation due to smaller viewport rendering
        // and potential auth redirect race conditions (BEA-375)
        navigationTimeout: 15000,
      },
    },
    /**
     * Real-Auth project: Tests real authentication paths against local Supabase (Docker).
     *
     * Unlike the other projects (which use E2E_TESTING=true to bypass Supabase),
     * this project tests:
     * - Supabase signInWithPassword (RS256 JWT verified via JWKS)
     * - Platform Hub OAuth 2.1 (HS256 JWT via SESSION_TOKEN_SECRET)
     * - Cross-app SSO (cookie propagation + middleware verification)
     *
     * Run separately: pnpm test:e2e:real-auth
     * (uses scripts/e2e-real-auth.sh which starts local Supabase + dev servers)
     */
    {
      name: 'real-auth',
      testDir: './e2e/real-auth',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${portConfig.hubPort}`,
        viewport: { width: 1280, height: 720 },
      },
      timeout: 90_000, // Real Supabase calls are slower than E2E bypass
      retries: 0, // No retries — avoid compounding rate limit issues
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
          command: 'pnpm --filter @beak-gaming/bingo start',
          url: `http://localhost:${portConfig.bingoPort}`,
          reuseExistingServer: false,
          timeout: 120 * 1000,
          stdout: 'ignore',
          stderr: 'ignore',
          env: { E2E_TESTING: 'true', PORT: String(portConfig.bingoPort) },
        },
        {
          command: 'pnpm --filter @beak-gaming/trivia start',
          url: `http://localhost:${portConfig.triviaPort}`,
          reuseExistingServer: false,
          timeout: 120 * 1000,
          stdout: 'ignore',
          stderr: 'ignore',
          env: { E2E_TESTING: 'true', PORT: String(portConfig.triviaPort) },
        },
        {
          command: 'pnpm --filter @beak-gaming/platform-hub start',
          url: `http://localhost:${portConfig.hubPort}`,
          reuseExistingServer: false,
          timeout: 120 * 1000,
          stdout: 'ignore',
          stderr: 'ignore',
          env: { E2E_TESTING: 'true', PORT: String(portConfig.hubPort) },
        },
      ]
    : undefined,
});
