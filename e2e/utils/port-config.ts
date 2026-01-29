/**
 * Shared E2E Port Configuration
 *
 * Single source of truth for port assignments used by:
 * - playwright.config.ts (project baseURLs, webServer config)
 * - e2e/global-setup.ts (server health checks)
 * - e2e/fixtures/auth.ts (authentication URLs)
 *
 * Port isolation enables parallel E2E testing across git worktrees.
 * See docs/E2E_TESTING_GUIDE.md for details.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface E2EPortConfig {
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
export function getE2EPortConfig(): E2EPortConfig {
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
