import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { getE2EPortConfig } from '../utils/port-config';
import { startGameViaWizard } from '../utils/helpers';
import { buildTriviaSeedInitScript } from '../utils/trivia-fixtures';

// -----------------------------------------------------------------------------
// Dynamic URL Constants for Worktree Isolation
// -----------------------------------------------------------------------------
// URLs are derived from the shared port configuration in e2e/utils/port-config.ts.
// This enables parallel E2E testing across multiple git worktrees.
// See e2e/utils/port-config.ts for the full implementation.
// -----------------------------------------------------------------------------

const portConfig = getE2EPortConfig();

const BINGO_URL = `http://localhost:${portConfig.bingoPort}`;
const TRIVIA_URL = `http://localhost:${portConfig.triviaPort}`;

// -----------------------------------------------------------------------------
// Trivia page fixture composition (BEA-714)
// -----------------------------------------------------------------------------
// Each fixture builds on the previous so specs can pick the minimum scaffolding
// they need. No fixture touches `trivia-settings` — SetupGate settings are
// purely derived after BEA-713, so the previous pre-seed was unnecessary AND
// actively harmful (it masked the production default `isByCategory: true`).
//
//   triviaPage             — bare: navigate to /play, nothing seeded.
//                            Use when a spec exercises the production defaults
//                            or drives the question importer UI itself
//                            (e.g. round-config.spec.ts).
//
//   triviaPageWithQuestions — composes triviaPage + seeds
//                            window.__triviaE2EQuestions via addInitScript so
//                            step 0 (Questions) of the SetupGate wizard is
//                            pre-satisfied. The setup overlay remains visible.
//                            Use for setup-overlay tests, or any spec that
//                            needs questions but not a started game.
//
//   triviaGameStarted       — composes triviaPageWithQuestions + runs
//                            startGameViaWizard so the game is in `playing`
//                            state before the test begins. Use for gameplay
//                            specs (presenter, display, dual-screen).
//
//   authenticatedTriviaPage — backward-compat alias for triviaGameStarted.
//                            New specs should prefer the composable fixtures.
// -----------------------------------------------------------------------------

/**
 * Game app fixtures for standalone E2E tests.
 * No authentication required -- games run in standalone mode.
 */
export interface GameFixtures {
  /**
   * Page navigated to Bingo /play, ready for testing.
   */
  authenticatedBingoPage: Page;

  /**
   * Level 0 trivia fixture: navigate to /play with NO seeding.
   */
  triviaPage: Page;

  /**
   * Level 1 trivia fixture: composes `triviaPage` and seeds
   * `window.__triviaE2EQuestions` before navigation so step 0 of the setup
   * wizard is pre-satisfied. The setup overlay remains visible.
   */
  triviaPageWithQuestions: Page;

  /**
   * Level 2 trivia fixture: composes `triviaPageWithQuestions` and drives the
   * setup wizard to completion via `startGameViaWizard`. Game status is
   * `playing` once the fixture resolves.
   */
  triviaGameStarted: Page;

  /**
   * Backward-compat alias for `triviaGameStarted`.
   *
   * Historically this fixture ALSO pre-seeded `trivia-settings` to force
   * `isByCategory: false, roundsCount: 3`. That workaround existed to mask the
   * SetupGate useEffect bug fixed in BEA-713. The seed is gone in BEA-714 —
   * settings are now driven purely by production defaults.
   *
   * Prefer the composable fixtures (`triviaPage`, `triviaPageWithQuestions`,
   * `triviaGameStarted`) in new code.
   */
  authenticatedTriviaPage: Page;

  /**
   * Skip automatic setup overlay (SetupGate) dismissal for Trivia.
   * Use this when testing the setup overlay itself.
   * Defaults to false (overlay IS dismissed automatically).
   *
   * NOTE: Only consumed by the backward-compat `authenticatedTriviaPage`
   * fixture. New specs should pick the explicit level they need instead of
   * toggling this flag: use `triviaPageWithQuestions` when they want the
   * overlay visible, or `triviaGameStarted` when they want a started game.
   */
  skipSetupDismissal: boolean;

  /**
   * Navigation timeout for game app pages in milliseconds.
   * Default: 5000ms. Override in project config for mobile: 15000ms.
   *
   * NOTE: Named `appNavigationTimeout` (not `navigationTimeout`) to avoid
   * colliding with Playwright's built-in `navigationTimeout` option, which
   * lives on `PlaywrightTestOptions` and would prevent us from using the
   * `{ option: true }` fixture syntax.
   */
  appNavigationTimeout: number;
}

/**
 * Extended test with game fixtures for standalone E2E tests.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures/auth';
 *
 * test('shows presenter view', async ({ triviaGameStarted: page }) => {
 *   // Game is already started (setup wizard auto-driven).
 * });
 *
 * test('setup overlay is visible', async ({ triviaPageWithQuestions: page }) => {
 *   // Questions seeded but overlay still up — step 0 pre-satisfied.
 * });
 *
 * test('production default is isByCategory: true', async ({ triviaPage: page }) => {
 *   // Nothing seeded — assert real defaults or drive the importer UI.
 * });
 * ```
 */
export const test = base.extend<GameFixtures>({
  /**
   * Skip automatic setup overlay (SetupGate) dismissal for Trivia.
   * Defaults to false (overlay IS dismissed automatically).
   * Only consumed by the backward-compat `authenticatedTriviaPage` fixture.
   */
  skipSetupDismissal: [false, { option: true }],

  /**
   * Navigation timeout for game app pages.
   * Default: 5000ms. Override in project config for mobile: 15000ms.
   */
  appNavigationTimeout: [5000, { option: true }],

  /**
   * Bingo page fixture.
   * Navigates directly to Bingo /play (no auth needed in standalone mode).
   */
  authenticatedBingoPage: async ({ page, appNavigationTimeout }, use) => {
    await page.goto(`${BINGO_URL}/play`, {
      waitUntil: 'load',
      timeout: appNavigationTimeout,
    });

    await use(page);
  },

  /**
   * Level 0 — bare Trivia page. Navigates to /play with NO seeding so specs
   * that test production defaults or drive the question importer UI see the
   * same initial state a real user would.
   */
  triviaPage: async ({ page, appNavigationTimeout }, use) => {
    await page.goto(`${TRIVIA_URL}/play`, {
      waitUntil: 'load',
      timeout: appNavigationTimeout,
    });

    await use(page);
  },

  /**
   * Level 1 — Trivia page with canned questions pre-seeded.
   *
   * Seeds window.__triviaE2EQuestions via addInitScript BEFORE navigation so
   * the game store picks it up during create(). addInitScript runs on every
   * frame including popups (so /display inherits the seeded state
   * automatically). The setup overlay remains visible — use this when a spec
   * needs the overlay up but with step 0 already pre-satisfied, or when it
   * wants to drive the wizard manually rather than via startGameViaWizard.
   *
   * See e2e/utils/trivia-fixtures.ts and docs/plans/BEA-697-e2e-baseline-fix.md
   * (Part C) for the full rationale.
   */
  triviaPageWithQuestions: async ({ page, appNavigationTimeout }, use) => {
    await page.addInitScript({ content: buildTriviaSeedInitScript() });

    await page.goto(`${TRIVIA_URL}/play`, {
      waitUntil: 'load',
      timeout: appNavigationTimeout,
    });

    await use(page);
  },

  /**
   * Level 2 — Trivia with a started game.
   *
   * Composes `triviaPageWithQuestions` (questions seeded, page on /play) and
   * then runs `startGameViaWizard` to drive the setup wizard to completion.
   * Game status is `playing` once this fixture resolves. Use for gameplay
   * specs (presenter, display, dual-screen) that want to skip the setup
   * dance entirely.
   */
  triviaGameStarted: async ({ triviaPageWithQuestions: page }, use) => {
    await startGameViaWizard(page);
    await use(page);
  },

  /**
   * Backward-compat alias for `triviaGameStarted` (respects the
   * `skipSetupDismissal` option for legacy specs).
   *
   * New specs should prefer the explicit composable fixtures:
   *   - `triviaPage` for bare /play
   *   - `triviaPageWithQuestions` for overlay-visible specs (instead of
   *     `skipSetupDismissal: true`)
   *   - `triviaGameStarted` for specs that need a started game
   */
  authenticatedTriviaPage: async (
    { triviaPageWithQuestions: page, skipSetupDismissal },
    use
  ) => {
    if (!skipSetupDismissal) {
      await startGameViaWizard(page);
    }
    await use(page);
  },
});

export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';
