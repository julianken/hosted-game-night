/**
 * Round Configuration E2E Tests (BEA-665)
 *
 * Tests the By Category toggle, QPR slider visibility, review grid distribution,
 * game start, and startGameViaWizard helper regression.
 *
 * Architecture notes:
 * - The game store starts with questions: [] (empty) — SAMPLE_QUESTIONS are NOT
 *   pre-loaded in E2E mode. Step 0 must have questions before step 1 is accessible.
 * - Step navigation gating:
 *     step 0 → requires questions.length > 0 to advance
 *     step 2 → requires currentTeams.length >= 2 to advance to step 3
 * - isByCategory defaults to true (SETTINGS_DEFAULTS in settings-store.ts).
 * - The trivia-api BFF endpoint is mocked via page.route() to avoid real network calls.
 *
 * Mock data: 15 questions across 3 rounds (5 per round), default settings.
 * Categories used: music, movies, history — to validate badge pills in S8.
 */

import { test, expect } from '../fixtures/game';
import { waitForHydration, startGameViaWizard } from '../utils/helpers';
import type { Page, Locator } from '@playwright/test';

// All tests in this file use the bare `triviaPage` fixture so no questions or
// settings are pre-seeded. This exercises real production defaults
// (`isByCategory: true`) and lets tests drive the TriviaApiImporter flow
// themselves via the mocked BFF endpoint.

// ---------------------------------------------------------------------------
// Mock question data — 15 questions, 3 rounds of 5 each
// Follows the Question type from apps/trivia/src/types
// Categories are intentionally varied to test badge pills (S8) and
// by-category redistribution (S3, S6, S7).
// ---------------------------------------------------------------------------

const MOCK_QUESTIONS = [
  // Round 0 — Music × 3, Movies × 2
  {
    id: 'e2e-r0-q1',
    text: 'E2E Q1: Music question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'music',
    roundIndex: 0,
  },
  {
    id: 'e2e-r0-q2',
    text: 'E2E Q2: Music question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'music',
    roundIndex: 0,
  },
  {
    id: 'e2e-r0-q3',
    text: 'E2E Q3: Music question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['False'],
    category: 'music',
    roundIndex: 0,
  },
  {
    id: 'e2e-r0-q4',
    text: 'E2E Q4: Movies question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'movies',
    roundIndex: 0,
  },
  {
    id: 'e2e-r0-q5',
    text: 'E2E Q5: Movies question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['False'],
    category: 'movies',
    roundIndex: 0,
  },
  // Round 1 — History × 3, Music × 2
  {
    id: 'e2e-r1-q1',
    text: 'E2E Q6: History question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'history',
    roundIndex: 1,
  },
  {
    id: 'e2e-r1-q2',
    text: 'E2E Q7: History question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'history',
    roundIndex: 1,
  },
  {
    id: 'e2e-r1-q3',
    text: 'E2E Q8: History question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['False'],
    category: 'history',
    roundIndex: 1,
  },
  {
    id: 'e2e-r1-q4',
    text: 'E2E Q9: Music question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'music',
    roundIndex: 1,
  },
  {
    id: 'e2e-r1-q5',
    text: 'E2E Q10: Music question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['False'],
    category: 'music',
    roundIndex: 1,
  },
  // Round 2 — Movies × 3, History × 2
  {
    id: 'e2e-r2-q1',
    text: 'E2E Q11: Movies question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'movies',
    roundIndex: 2,
  },
  {
    id: 'e2e-r2-q2',
    text: 'E2E Q12: Movies question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'movies',
    roundIndex: 2,
  },
  {
    id: 'e2e-r2-q3',
    text: 'E2E Q13: Movies question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['False'],
    category: 'movies',
    roundIndex: 2,
  },
  {
    id: 'e2e-r2-q4',
    text: 'E2E Q14: History question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'history',
    roundIndex: 2,
  },
  {
    id: 'e2e-r2-q5',
    text: 'E2E Q15: History question',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['False'],
    category: 'history',
    roundIndex: 2,
  },
];

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Mock the BFF trivia-api questions endpoint and use the TriviaApiImporter UI
 * to load MOCK_QUESTIONS into the game store.
 *
 * After calling this helper, the wizard is on step 0 with 15 questions loaded.
 * The route mock is unregistered after loading to avoid interference.
 */
async function importQuestionsViaApiMock(page: Page, gate: Locator): Promise<void> {
  // Intercept the BFF endpoint before clicking Fetch
  await page.route('**/api/trivia-api/questions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        questions: MOCK_QUESTIONS,
        meta: {
          fetchedAt: new Date().toISOString(),
          totalFetched: MOCK_QUESTIONS.length,
          source: 'the-trivia-api',
          cached: false,
        },
      }),
    });
  });

  // Click "Fetch Questions" in the TriviaApiImporter (step 0)
  const fetchBtn = gate.getByRole('button', { name: /fetch questions/i });
  await expect(fetchBtn).toBeVisible();
  await fetchBtn.click();

  // Wait for preview state — "Load into Game" button appears
  const loadBtn = gate.getByRole('button', { name: /load into game/i });
  await expect(loadBtn).toBeVisible({ timeout: 10000 });
  await loadBtn.click();

  // Confirm questions are loaded (green success banner in step 0)
  await expect(gate.getByText(/15 questions loaded/i)).toBeVisible();

  // Clean up the route mock
  await page.unroute('**/api/trivia-api/questions**');
}

/**
 * Navigate from step 0 to the Settings step (step 1).
 * Requires questions to already be loaded in the store.
 */
async function navigateToSettingsStep(gate: Locator): Promise<void> {
  await gate.locator('[data-testid="wizard-step-1"]').click();
  // Confirm step 1 content is active — Settings heading
  await expect(gate.getByRole('heading', { name: /^settings$/i })).toBeVisible();
}

/**
 * Add N teams via the wizard Teams step (step 2).
 * Requires the wizard to currently be on step 2.
 */
async function addTeams(gate: Locator, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    const addTeamBtn = gate.getByRole('button', { name: /add team/i });
    await expect(addTeamBtn).toBeVisible();
    await addTeamBtn.click();
    await expect(gate.getByText(new RegExp(`table ${i + 1}`, 'i'))).toBeVisible();
  }
}

/**
 * Navigate from any step to step 2 (Teams), add 2 teams, then navigate to
 * step 3 (Review). The wizard gates forward navigation from step 2 → step 3
 * on currentTeams.length >= 2.
 */
async function navigateToReviewWithTeams(gate: Locator): Promise<Locator> {
  await gate.locator('[data-testid="wizard-step-2"]').click();
  // Confirm Teams step is active
  await expect(gate.getByRole('button', { name: /add team/i })).toBeVisible();

  // Add 2 teams (step 2 gating requires teams >= 2)
  await addTeams(gate, 2);

  // Navigate to Review step
  await gate.locator('[data-testid="wizard-step-3"]').click();
  const reviewContent = gate.locator('[data-testid="wizard-step-review"]');
  await expect(reviewContent).toBeVisible();

  return reviewContent;
}

// ---------------------------------------------------------------------------
// S1 — Toggle ON by default; Rounds slider visible; QPR slider NOT visible
// ---------------------------------------------------------------------------

test.describe('Round Config — Settings Step', () => {
  test.beforeEach(async ({ triviaPage: page }) => {
    await waitForHydration(page);
  });

  test('S1: By Category toggle is ON by default; Rounds slider visible; QPR slider hidden @critical', async ({ triviaPage: page }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Load questions so we can reach step 1
    await importQuestionsViaApiMock(page, gate);

    // Navigate to Settings step (step 1)
    await navigateToSettingsStep(gate);

    // By Category toggle should be ON (isByCategory: true is the default)
    const toggle = gate.getByRole('switch', { name: /by category/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Number of Rounds slider should always be visible
    const roundsSlider = gate.getByRole('slider', { name: /number of rounds/i });
    await expect(roundsSlider).toBeVisible();

    // Questions Per Round slider should NOT be visible when By Category is ON
    const qprSlider = gate.getByRole('slider', { name: /questions per round/i });
    await expect(qprSlider).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // S8 — Per-round breakdown pills in settings step show round + category + count
  //
  // Note: The "Questions Per Round" slider no longer exists (WizardStepSettings
  // renders a plain text hint in by-count mode). A former S2 test that asserted
  // the QPR slider was deleted when the slider was removed — see
  // WizardStepSettings.test.tsx's "slider NEVER present" regression guard.
  // ---------------------------------------------------------------------------

  test('S8: Per-round pills in Settings step show round + category + count @high', async ({ triviaPage: page }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Load 15 questions (music: 5, movies: 5, history: 5 across all rounds)
    await importQuestionsViaApiMock(page, gate);
    await navigateToSettingsStep(gate);

    // By Category is ON — per-round breakdown pills should be visible (State B).
    // Pills render as "Round N — CategoryName" + "N questions" using `rounded-lg`.
    const gateContent = gate.locator('[data-testid="setup-gate-content"]');

    await expect(async () => {
      const pillTexts = await gateContent.locator('.rounded-lg').allTextContents();
      // At least one pill must contain "Round N" and "N question(s)" text.
      const hasRoundPill = pillTexts.some(
        (text) => /Round\s+\d+/i.test(text) && /\d+\s+question/i.test(text),
      );
      expect(hasRoundPill).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // S9 — Empty state: without questions, settings step navigation is blocked
  // ---------------------------------------------------------------------------

  test('S9: Without questions, clicking the Settings step button has no effect @high', async ({ triviaPage: page }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Do NOT import questions — store starts with questions: []
    // The step 0 content (Questions heading) should be visible by default
    const gateContent = gate.locator('[data-testid="setup-gate-content"]');
    await expect(gateContent.getByRole('heading', { name: /^questions$/i })).toBeVisible();

    // Clicking step 1 (Settings) is blocked by navigation gating
    // (goToStep checks isStepComplete(0) = questions.length > 0)
    await gate.locator('[data-testid="wizard-step-1"]').click();

    // We should still be on step 0 — Settings heading should NOT be visible
    await expect(gateContent.getByRole('heading', { name: /^settings$/i })).not.toBeVisible();

    // Step 0 content still visible
    await expect(gateContent.getByRole('heading', { name: /^questions$/i })).toBeVisible();

    // The "Fetch Questions" button from TriviaApiImporter should still be visible
    await expect(gate.getByRole('button', { name: /fetch questions/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// S3 — Review step: sum of per-round question counts equals total questions
// ---------------------------------------------------------------------------

test.describe('Round Config — Review Step', () => {
  test.beforeEach(async ({ triviaPage: page }) => {
    await waitForHydration(page);
  });

  test('S3: Review grid — sum of round counts equals total questions loaded @high', async ({ triviaPage: page }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Load 15 questions
    await importQuestionsViaApiMock(page, gate);

    // Navigate to Review step via Teams step (requires 2+ teams for step 2 gating)
    const reviewContent = await navigateToReviewWithTeams(gate);

    // The review grid shows per-round counts: "Round 1: N questions", etc.
    // With 15 questions and default roundsCount=3, we expect 5 per round.
    // Read all round pill text to compute the sum.
    await expect(async () => {
      const roundTexts = await reviewContent.locator('.grid > div').allTextContents();
      // Each pill text is like "Round 1: 5 questions" or "Round 1: 5 question"
      const counts = roundTexts.map((text) => {
        const match = text.match(/(\d+)\s+question/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const total = counts.reduce((sum, c) => sum + c, 0);
      // Total across all rounds must equal 15 (the number of questions we loaded)
      expect(total).toBe(15);
    }).toPass({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // S7 — By Category ON with rounds: all round pills green in review
  // ---------------------------------------------------------------------------

  test('S7: By Category ON with correct distribution — all round pills are green @high', async ({ triviaPage: page }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Load 15 questions — by_category mode distributes evenly across 3 rounds
    await importQuestionsViaApiMock(page, gate);

    // Navigate to Review step via Teams step (requires 2+ teams)
    const reviewContent = await navigateToReviewWithTeams(gate);

    // All round pills should have the success (green) CSS class.
    // Pills use bg-success/10 when counts match, bg-warning/10 when mismatched.
    await expect(async () => {
      const pills = reviewContent.locator('.grid > div');
      const count = await pills.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const pill = pills.nth(i);
        const className = await pill.getAttribute('class');
        // Green pills have "bg-success" class; orange/warning pills have "bg-warning"
        expect(className).toContain('bg-success');
        expect(className).not.toContain('bg-warning');
      }
    }).toPass({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // S6 — Toggle By Category OFF then ON re-distributes questions
  // ---------------------------------------------------------------------------

  test('S6: Toggling By Category OFF then ON re-distributes questions (review reflects change) @high', async ({ triviaPage: page }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Load 15 questions (By Category ON = default)
    await importQuestionsViaApiMock(page, gate);
    await navigateToSettingsStep(gate);

    // Toggle OFF (switch to by_count mode)
    const toggle = gate.getByRole('switch', { name: /by category/i });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Toggle back ON (switch to by_category mode)
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Navigate to Review step via Teams step (requires 2+ teams)
    const reviewContent = await navigateToReviewWithTeams(gate);

    // The review grid should still show round pills with non-zero question counts.
    // All 15 questions should be accounted for after redistribution.
    await expect(async () => {
      const roundTexts = await reviewContent.locator('.grid > div').allTextContents();
      expect(roundTexts.length).toBeGreaterThan(0);
      const total = roundTexts.reduce((sum, text) => {
        const match = text.match(/(\d+)\s+question/);
        return sum + (match ? parseInt(match[1], 10) : 0);
      }, 0);
      expect(total).toBe(15);
    }).toPass({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // S4 — Game starts successfully with By Category ON (default state)
  // ---------------------------------------------------------------------------

  test('S4: Game starts successfully with By Category ON (default) @critical', async ({ triviaPage: page }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Load 15 questions
    await importQuestionsViaApiMock(page, gate);

    // Navigate to Review step via Teams step.
    // Step 2 gating requires >= 2 teams to navigate forward to step 3.
    const reviewContent = await navigateToReviewWithTeams(gate);

    // Start Game button should be enabled (2 teams + 15 questions loaded)
    const startBtn = reviewContent.getByRole('button', { name: /start game/i });
    await expect(startBtn).toBeEnabled({ timeout: 5000 });
    await startBtn.click();

    // Gate should fade out and detach
    await gate.waitFor({ state: 'detached', timeout: 7000 });

    // Verify game is in playing state
    await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// S5 — startGameViaWizard helper regression (bare `triviaPage` fixture)
// ---------------------------------------------------------------------------

test.describe('startGameViaWizard helper regression', () => {
  // S5 uses the bare `triviaPage` fixture so we can import questions manually
  // via the mocked BFF endpoint, then call startGameViaWizard to verify the
  // helper works correctly with By Category ON (the default).
  // This ensures BEA-665 changes did not break the helper.

  test('S5: startGameViaWizard helper works correctly with By Category default @critical', async ({ triviaPage: page }) => {
    await waitForHydration(page);

    const gate = page.locator('[data-testid="setup-gate"]');

    // Load questions so the wizard can advance past step 0
    await importQuestionsViaApiMock(page, gate);

    // Call the helper — it navigates to Teams, adds 2 teams (the default after
    // the BEA-665 fix, since step 2 gating requires >= 2 teams), then starts the game.
    await startGameViaWizard(page);

    // Gate should be gone — game started
    await expect(gate).not.toBeVisible();

    // Verify game is in playing state
    await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
  });
});
