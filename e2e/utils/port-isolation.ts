/**
 * E2E Test Port Isolation Utilities
 *
 * This module provides deterministic port assignment for E2E tests based on the
 * current working directory (worktree path). This enables parallel E2E testing
 * across multiple git worktrees without port conflicts.
 *
 * Port Allocation Scheme:
 * - Main repo (default): Uses base ports 3000, 3001, 3002
 * - Worktrees: Use offset ports based on hash of worktree path
 * - Port range: 3000-3999 (1000 ports available)
 * - Each environment uses 3 consecutive ports (bingo, trivia, hub)
 *
 * Hash-based Port Formula:
 * - portOffset = (hash(worktreePath) % 333) * 3  // Max 333 worktrees, 3 ports each
 * - bingoPort = 3000 + portOffset
 * - triviaPort = 3001 + portOffset
 * - hubPort = 3002 + portOffset
 *
 * Environment Variable Overrides:
 * - E2E_PORT_BASE: Manually set the base port (e.g., 3100)
 * - E2E_BINGO_PORT: Override Bingo port specifically
 * - E2E_TRIVIA_PORT: Override Trivia port specifically
 * - E2E_HUB_PORT: Override Platform Hub port specifically
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Port configuration for E2E tests.
 */
export interface E2EPortConfig {
  /** Bingo app port (default: 3000) */
  bingoPort: number;
  /** Trivia app port (default: 3001) */
  triviaPort: number;
  /** Platform Hub port (default: 3002) */
  hubPort: number;
  /** Base port offset from 3000 */
  portOffset: number;
  /** Whether running in a worktree (vs main repo) */
  isWorktree: boolean;
  /** Path to the detected worktree or main repo */
  repoPath: string;
  /** Source of port configuration */
  source: 'default' | 'env-override' | 'hash-based';
}

/**
 * Default base ports for E2E tests.
 */
const DEFAULT_BINGO_PORT = 3000;
const DEFAULT_TRIVIA_PORT = 3001;
const DEFAULT_HUB_PORT = 3002;

/**
 * Maximum number of unique port environments (worktrees).
 * With 3 ports per environment, we can support 333 unique environments.
 * This keeps port offsets within 0-999, staying under port 3999.
 */
const MAX_ENVIRONMENTS = 333;

/**
 * Detects if the current directory is a git worktree.
 *
 * Git worktrees have a `.git` file (not directory) that points to the main repo.
 * Main repos have a `.git` directory.
 *
 * @param startPath - Path to check (defaults to cwd)
 * @returns Object with isWorktree flag and paths
 */
export function detectWorktree(startPath?: string): {
  isWorktree: boolean;
  worktreePath: string | null;
  mainRepoPath: string | null;
} {
  const checkPath = startPath || process.cwd();

  // Find the .git entry (file or directory)
  let currentPath = checkPath;
  let gitPath: string | null = null;

  // Walk up the directory tree to find .git
  while (currentPath !== path.dirname(currentPath)) {
    const potentialGit = path.join(currentPath, '.git');
    if (fs.existsSync(potentialGit)) {
      gitPath = potentialGit;
      break;
    }
    currentPath = path.dirname(currentPath);
  }

  if (!gitPath) {
    // Not in a git repository
    return {
      isWorktree: false,
      worktreePath: null,
      mainRepoPath: null,
    };
  }

  // Check if .git is a file (worktree) or directory (main repo)
  const gitStat = fs.statSync(gitPath);

  if (gitStat.isDirectory()) {
    // This is the main repo
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
    // Extract main repo path from worktree gitdir
    const worktreeGitDir = gitDirMatch[1];
    // worktreeGitDir is like: /main/repo/.git/worktrees/wt-name
    // Main repo .git is: /main/repo/.git
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
 * Generates a deterministic port offset from a path using a hash function.
 *
 * The hash ensures:
 * - Same path always gets same offset (deterministic)
 * - Different paths get different offsets (with high probability)
 * - Offset is within valid range (0 to MAX_PORT_OFFSET)
 *
 * @param pathToHash - The path to hash (typically worktree path)
 * @returns Port offset (multiple of 3 for consecutive ports)
 */
export function hashPathToPortOffset(pathToHash: string): number {
  // Use SHA-256 for deterministic hashing
  const hash = crypto.createHash('sha256').update(pathToHash).digest('hex');

  // Take first 8 hex chars (32 bits) and convert to number
  const hashInt = parseInt(hash.substring(0, 8), 16);

  // Map to port offset range (must be multiple of 3 for consecutive ports)
  // Use modulo to get range 0-332, then multiply by 3 for offset 0, 3, 6, ..., 996
  const offsetIndex = hashInt % MAX_ENVIRONMENTS;
  const portOffset = offsetIndex * 3;

  return portOffset;
}

/**
 * Gets the E2E port configuration for the current environment.
 *
 * Priority:
 * 1. Environment variable overrides (E2E_PORT_BASE, E2E_*_PORT)
 * 2. Hash-based assignment for worktrees
 * 3. Default ports for main repo
 *
 * @param cwd - Current working directory (defaults to process.cwd())
 * @returns Complete port configuration
 */
export function getE2EPortConfig(cwd?: string): E2EPortConfig {
  const currentDir = cwd || process.cwd();

  // Check for environment variable overrides first
  const envPortBase = process.env.E2E_PORT_BASE;
  const envBingoPort = process.env.E2E_BINGO_PORT;
  const envTriviaPort = process.env.E2E_TRIVIA_PORT;
  const envHubPort = process.env.E2E_HUB_PORT;

  // Detect worktree status
  const worktreeInfo = detectWorktree(currentDir);

  // If specific port overrides are set, use them
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

  // If in a worktree, use hash-based port assignment
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

  // Default: main repo with base ports
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

/**
 * Gets the URL for a specific app based on port configuration.
 *
 * @param app - The app to get URL for
 * @param portConfig - Port configuration (defaults to auto-detected)
 * @returns Full URL including protocol and port
 */
export function getAppUrl(
  app: 'bingo' | 'trivia' | 'hub',
  portConfig?: E2EPortConfig
): string {
  const config = portConfig || getE2EPortConfig();

  switch (app) {
    case 'bingo':
      return `http://localhost:${config.bingoPort}`;
    case 'trivia':
      return `http://localhost:${config.triviaPort}`;
    case 'hub':
      return `http://localhost:${config.hubPort}`;
    default:
      throw new Error(`Unknown app: ${app}`);
  }
}

/**
 * Logs the current port configuration for debugging.
 *
 * @param config - Port configuration to log
 */
export function logPortConfig(config: E2EPortConfig): void {
  console.log('[E2E Port Config]');
  console.log(`  Source: ${config.source}`);
  console.log(`  Is Worktree: ${config.isWorktree}`);
  console.log(`  Repo Path: ${config.repoPath}`);
  console.log(`  Port Offset: ${config.portOffset}`);
  console.log(`  Bingo: http://localhost:${config.bingoPort}`);
  console.log(`  Trivia: http://localhost:${config.triviaPort}`);
  console.log(`  Hub: http://localhost:${config.hubPort}`);
}

// Export a singleton config for convenience
// This is computed once at module load time
let _cachedConfig: E2EPortConfig | null = null;

/**
 * Gets the cached E2E port configuration.
 * Configuration is computed once and cached for the lifetime of the process.
 *
 * @returns Cached port configuration
 */
export function getCachedPortConfig(): E2EPortConfig {
  if (!_cachedConfig) {
    _cachedConfig = getE2EPortConfig();
  }
  return _cachedConfig;
}

// Re-export commonly used values for convenience
export const BINGO_URL = () => getAppUrl('bingo');
export const TRIVIA_URL = () => getAppUrl('trivia');
export const HUB_URL = () => getAppUrl('hub');
