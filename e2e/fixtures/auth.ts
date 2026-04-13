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
   * Page navigated to Trivia /play, ready for testing.
   * The setup wizard is automatically dismissed unless skipSetupDismissal is true.
   */
  authenticatedTriviaPage: Page;

  /**
   * Skip automatic setup overlay (SetupGate) dismissal for Trivia.
   * Use this when testing the setup overlay itself.
   * Defaults to false (overlay IS dismissed automatically).
   */
  skipSetupDismissal: boolean;

  /**
   * Navigation timeout for game app pages in milliseconds.
   * Default: 5000ms. Override in project config for mobile: 15000ms.
   */
  navigationTimeout: number;
}

/**
 * Extended test with game fixtures for standalone E2E tests.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures/auth';
 *
 * test('shows presenter view', async ({ authenticatedBingoPage: page }) => {
 *   // Page is already on /play
 * });
 * ```
 */
export const test = base.extend<GameFixtures>({
  /**
   * Skip automatic setup overlay (SetupGate) dismissal for Trivia.
   * Defaults to false (overlay IS dismissed automatically).
   * Set to true in tests that need to test the setup overlay itself.
   */
  skipSetupDismissal: [false, { option: true }],

  /**
   * Navigation timeout for game app pages.
   * Default: 5000ms. Override in project config for mobile: 15000ms.
   */
  navigationTimeout: [5000, { option: true }],

  /**
   * Bingo page fixture.
   * Navigates directly to Bingo /play (no auth needed in standalone mode).
   */
  authenticatedBingoPage: async ({ page, navigationTimeout }, use) => {
    await page.goto(`${BINGO_URL}/play`, {
      waitUntil: 'load',
      timeout: navigationTimeout,
    });

    await use(page);
  },

  /**
   * Trivia page fixture.
   * Navigates directly to Trivia /play and dismisses the setup wizard
   * (unless skipSetupDismissal is true).
   *
   * Before navigation, seeds window.__triviaE2EQuestions via addInitScript so
   * the game store's initial state includes a valid 15-question canned set.
   * This keeps SetupWizard's step-0 (Questions) gate open so startGameViaWizard
   * can advance to the Teams step without a network-dependent API fetch.
   *
   * See e2e/utils/trivia-fixtures.ts and docs/plans/BEA-697-e2e-baseline-fix.md
   * (Part C) for the full rationale.
   */
  authenticatedTriviaPage: async ({ page, skipSetupDismissal, navigationTimeout }, use) => {
    // Seed canned trivia questions before navigation so the game store picks
    // them up on create(). addInitScript runs on every frame including popups
    // (so /display inherits the seeded state automatically).
    await page.addInitScript({ content: buildTriviaSeedInitScript() });

    // Pre-seed `trivia-settings` (the Zustand `persist` key) so SetupGate's
    // "by-category" auto-rounds effect does not bump `roundsCount` up to 6.
    // The seeded 15-question set spans 7 unique categories across 3 rounds
    // (roundIndex 0/1/2). If `isByCategory` is left at its default (true),
    // SetupGate's useEffect fires `updateSetting('roundsCount', min(7, 6))`,
    // leaving rounds 4–6 with zero questions and `Start Game` disabled.
    // Forcing `isByCategory: false` and `roundsCount: 3` keeps the fixture
    // aligned with the question seed. We also guarantee a fresh game store.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          'trivia-settings',
          JSON.stringify({
            state: {
              roundsCount: 3,
              questionsPerRound: 5,
              timerDuration: 30,
              timerAutoStart: true,
              timerVisible: true,
              timerAutoReveal: true,
              ttsEnabled: false,
              isByCategory: false,
              lastTeamSetup: null,
            },
            version: 4,
          }),
        );
        window.localStorage.removeItem('trivia-game');
      } catch {
        // Ignore — localStorage may not be available in some contexts.
      }
    });

    await page.goto(`${TRIVIA_URL}/play`, {
      waitUntil: 'load',
      timeout: navigationTimeout,
    });

    // Start game via setup wizard (unless test opts out)
    if (!skipSetupDismissal) {
      await startGameViaWizard(page);
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
