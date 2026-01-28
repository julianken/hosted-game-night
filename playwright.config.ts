import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as crypto from 'crypto';

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

// -----------------------------------------------------------------------------
// Dynamic Port Configuration for Worktree Isolation
// -----------------------------------------------------------------------------
// This enables parallel E2E testing across multiple git worktrees.
//
// How it works:
// 1. Main repo uses default ports: 3000 (bingo), 3001 (trivia), 3002 (hub)
// 2. Worktrees use hash-based port offsets derived from their path
// 3. Environment variables can override: E2E_PORT_BASE, E2E_*_PORT
//
// Examples:
// - Main repo: ports 3000, 3001, 3002
// - Worktree "wt-BEA-330": ports might be 3156, 3157, 3158 (based on path hash)
// - E2E_PORT_BASE=3100: ports 3100, 3101, 3102
//
// See e2e/utils/port-isolation.ts for the full implementation.
// -----------------------------------------------------------------------------

interface E2EPortConfig {
  bingoPort: number;
  triviaPort: number;
  hubPort: number;
  portOffset: number;
  isWorktree: boolean;
  repoPath: string;
  source: 'default' | 'env-override' | 'hash-based';
}

/**
 * Detects if the current directory is a git worktree.
 * Git worktrees have a `.git` file (not directory) that points to the main repo.
 */
function detectWorktree(startPath?: string): {
  isWorktree: boolean;
  worktreePath: string | null;
  mainRepoPath: string | null;
} {
  const checkPath = startPath || process.cwd();
  let currentPath = checkPath;
  let gitPath: string | null = null;

  while (currentPath !== path.dirname(currentPath)) {
    const potentialGit = path.join(currentPath, '.git');
    if (fs.existsSync(potentialGit)) {
      gitPath = potentialGit;
      break;
    }
    currentPath = path.dirname(currentPath);
  }

  if (!gitPath) {
    return { isWorktree: false, worktreePath: null, mainRepoPath: null };
  }

  const gitStat = fs.statSync(gitPath);

  if (gitStat.isDirectory()) {
    return {
      isWorktree: false,
      worktreePath: null,
      mainRepoPath: path.dirname(gitPath),
    };
  }

  // .git is a file - this is a worktree
  // File contents: "gitdir: /path/to/main/.git/worktrees/worktree-name"
  const gitFileContent = fs.readFileSync(gitPath, 'utf-8').trim();
  const gitDirMatch = gitFileContent.match(/^gitdir:\s*(.+)$/);

  if (gitDirMatch) {
    const worktreeGitDir = gitDirMatch[1];
    const mainGitDir = path.resolve(
      path.dirname(gitPath),
      worktreeGitDir,
      '../..'
    );
    const mainRepoPath = path.dirname(mainGitDir);

    return {
      isWorktree: true,
      worktreePath: path.dirname(gitPath),
      mainRepoPath: mainRepoPath,
    };
  }

  return {
    isWorktree: false,
    worktreePath: null,
    mainRepoPath: path.dirname(gitPath),
  };
}

/**
 * Generates a deterministic port offset from a path using SHA-256 hash.
 * Same path always gets same offset (deterministic).
 * Offset range: 0-996 (multiples of 3 to keep ports consecutive).
 */
function hashPathToPortOffset(pathToHash: string): number {
  const hash = crypto.createHash('sha256').update(pathToHash).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  // Map to 0-332, then multiply by 3 for offsets 0, 3, 6, ..., 996
  const offsetIndex = hashInt % 333;
  return offsetIndex * 3;
}

/**
 * Gets the E2E port configuration for the current environment.
 * Priority: env overrides > hash-based (worktrees) > defaults (main repo)
 */
function getE2EPortConfig(): E2EPortConfig {
  const DEFAULT_BINGO_PORT = 3000;
  const DEFAULT_TRIVIA_PORT = 3001;
  const DEFAULT_HUB_PORT = 3002;

  const currentDir = process.cwd();
  const envPortBase = process.env.E2E_PORT_BASE;
  const envBingoPort = process.env.E2E_BINGO_PORT;
  const envTriviaPort = process.env.E2E_TRIVIA_PORT;
  const envHubPort = process.env.E2E_HUB_PORT;

  const worktreeInfo = detectWorktree(currentDir);

  // Priority 1: Environment variable overrides
  if (envBingoPort || envTriviaPort || envHubPort || envPortBase) {
    const baseOffset = envPortBase ? parseInt(envPortBase, 10) - DEFAULT_BINGO_PORT : 0;

    return {
      bingoPort: envBingoPort ? parseInt(envBingoPort, 10) : DEFAULT_BINGO_PORT + baseOffset,
      triviaPort: envTriviaPort ? parseInt(envTriviaPort, 10) : DEFAULT_TRIVIA_PORT + baseOffset,
      hubPort: envHubPort ? parseInt(envHubPort, 10) : DEFAULT_HUB_PORT + baseOffset,
      portOffset: baseOffset,
      isWorktree: worktreeInfo.isWorktree,
      repoPath: worktreeInfo.worktreePath || worktreeInfo.mainRepoPath || currentDir,
      source: 'env-override',
    };
  }

  // Priority 2: Hash-based assignment for worktrees
  if (worktreeInfo.isWorktree && worktreeInfo.worktreePath) {
    const portOffset = hashPathToPortOffset(worktreeInfo.worktreePath);

    return {
      bingoPort: DEFAULT_BINGO_PORT + portOffset,
      triviaPort: DEFAULT_TRIVIA_PORT + portOffset,
      hubPort: DEFAULT_HUB_PORT + portOffset,
      portOffset,
      isWorktree: true,
      repoPath: worktreeInfo.worktreePath,
      source: 'hash-based',
    };
  }

  // Priority 3: Default ports for main repo
  return {
    bingoPort: DEFAULT_BINGO_PORT,
    triviaPort: DEFAULT_TRIVIA_PORT,
    hubPort: DEFAULT_HUB_PORT,
    portOffset: 0,
    isWorktree: false,
    repoPath: worktreeInfo.mainRepoPath || currentDir,
    source: 'default',
  };
}

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
