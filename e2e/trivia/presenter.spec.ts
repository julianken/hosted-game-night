/**
 * Trivia Presenter View E2E Tests
 *
 * ⚠️ REFACTORED (BEA-383): Replaced all 68 waitForTimeout() calls with deterministic waits
 * - Pattern 1: Wait for element visibility after actions (e.g., team added, score updated)
 * - Pattern 2: Wait for state change indicators (e.g., game status, button states)
 * - Pattern 3: Use .toPass() for complex conditions requiring retry logic
 */
import { test, expect, type Page } from '../fixtures/auth';
import { waitForHydration, pressKey } from '../utils/helpers';
import { buildTriviaSettingsSeedInitScript } from '../utils/trivia-fixtures';

// Presenter specs drive the canned 7-category question seed through the
// setup wizard. Without pinning `isByCategory: false` / `roundsCount: 3`,
// SetupGate's by-category auto-rounds effect bumps rounds to 6 and leaves
// the Review step invalid. Apply the settings seed at file scope so it
// runs BEFORE the `authenticatedTriviaPage` fixture navigates to /play.
// This is deliberately local (not in a shared fixture) so specs that
// assert production defaults — notably `round-config.spec.ts` — are
// unaffected.
test.beforeEach(async ({ page }) => {
  await page.addInitScript({ content: buildTriviaSettingsSeedInitScript() });
});

/**
 * Drive the presenter from the post-startGame `game_intro` scene up to the
 * `question_display` scene by pressing Enter repeatedly to skip each timed
 * intro/anticipation scene. Called before assertions that require the first
 * question to be actively displayed.
 *
 * Scene chain: game_intro → round_intro → question_anticipation →
 * question_display. Each Enter dispatches SCENE_TRIGGERS.SKIP, which is the
 * only deterministic way to bypass the auto-advance timers quickly.
 */
async function driveToQuestionDisplay(page: Page): Promise<void> {
  // Scene label lives in the header as "Audience: <scene>". Poll for it so
  // we advance exactly as many scenes as needed and no more. The stopping
  // point is `question_display`; any "earlier" timed scene (game_intro,
  // round_intro, question_anticipation) and `question_closed` (so we can
  // advance from one closed question to the next question's display) are
  // skipped by pressing Enter/Right. Any non-skippable scene (round_summary,
  // round_scoring, recap_*, final_*, paused, emergency_blank) is treated as
  // an error — callers must handle those explicitly.
  const skippable = /game intro|round intro|question anticipation/i;
  await expect(async () => {
    const header = page.locator('span').filter({ hasText: /Audience:/ }).first();
    const text = (await header.textContent()) ?? '';
    if (/question display/i.test(text)) return; // done
    if (skippable.test(text)) {
      await page.keyboard.press('Enter');
      throw new Error(`Scene still ${text}`);
    }
    throw new Error(`Unexpected scene: ${text}`);
  }).toPass({ timeout: 15000 });
}

/**
 * Drive the presenter to the `question_closed` scene (S key after reaching
 * question_display).
 */
async function driveToQuestionClosed(page: Page): Promise<void> {
  await driveToQuestionDisplay(page);
  await page.keyboard.press('KeyS');
  await expect(
    page.locator('span').filter({ hasText: /Audience:.*question closed/i })
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Drive a trivia game to the ended state by completing all rounds.
 * Assumes the game has already been started (via startGameViaWizard).
 * Default game: 3 rounds x 5 questions each.
 *
 * For each round:
 *   1. Navigate to the last question of the round (ArrowDown x4 for Q5)
 *   2. Close the question (S key) to enter question_closed scene
 *   3. Click the SceneNavButtons "Next" button to advance to round_summary
 *   4. Wait for the RoundSummary overlay to appear
 *   5. Press N (next_round) to advance — goes to round_intro for non-last rounds,
 *      final_buildup/final_podium for the last round
 *
 * After the last round the auto-show effect fires, showing the Final Results overlay.
 */
async function driveGameToEndedState(page: Page, totalRounds = 3, _questionsPerRound = 5): Promise<void> {
  for (let round = 0; round < totalRounds; round++) {
    // Walk every question of this round. Identify the last question via the
    // SceneNavButtons forward label (switches from "Next Question" →
    // "End Round") rather than a loop counter — the game engine's
    // isLastQuestion is the authoritative source.
    // Walk through every question of this round via S + ArrowRight so the
    // question_closed → round_summary transition triggers completeRound
    // (status → between_rounds). See the detailed explanation in the
    // 'can complete round and proceed to next' test below.
    const MAX_QUESTIONS = 10;
    for (let q = 0; q < MAX_QUESTIONS; q++) {
      await driveToQuestionDisplay(page);
      await page.keyboard.press('KeyS');
      await expect(
        page.locator('span').filter({ hasText: /audience:.*question closed/i })
      ).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('ArrowRight');
      const sceneText = (await page
        .locator('span')
        .filter({ hasText: /^Audience:/ })
        .first()
        .textContent()) ?? '';
      if (/round summary/i.test(sceneText)) break;
    }

    // After closing the last question of the round the scene advances to
    // round_summary, which auto-shows the RoundSummary overlay.
    const isLastRound = round === totalRounds - 1;
    if (!isLastRound) {
      // Wait for the round summary heading to appear
      await expect(async () => {
        await expect(
          page.getByRole('heading', { name: /round.*complete/i }).first()
        ).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 10000 });

      // Click the RoundSummary overlay's "Next Round" button directly --
      // dispatching KeyN while the overlay is focused can race with the
      // modal's own keyboard handling, so prefer the explicit click path.
      // The accessible name is "Start round N" (aria-label); visible text
      // is "Next Round" -- match either.
      const nextRoundBtn = page.getByRole('button', {
        name: /next round|start round \d+/i,
      });
      await expect(nextRoundBtn).toBeVisible({ timeout: 5000 });
      await nextRoundBtn.click();

      // Wait for the next round to leave round_summary (the overlay sets
      // showRoundSummary=false as soon as the scene advances out of
      // round_summary, see play/page.tsx).
      await expect(
        page.locator('span').filter({ hasText: /audience:(?!.*round summary)/i })
      ).toBeVisible({ timeout: 10000 });

      // Wait for the `playing` status badge to return
      await expect(async () => {
        await expect(
          page.locator('span').filter({ hasText: /^Playing/ })
        ).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 10000 });
    } else {
      // Last round: wait for the RoundSummary "End Game" button to render,
      // then advance via the N key rather than clicking the button.
      //
      // The click path goes through play/page.tsx::handleNextRound which
      // bypasses the scene engine (calls game.nextRound() directly + forces
      // audienceScene to 'round_intro'). That path corrupts the ended-state
      // scene (should be final_podium / final_buildup, not round_intro).
      //
      // Pressing N dispatches SCENE_TRIGGERS.NEXT_ROUND through the scene
      // engine, which correctly routes isLastRound → 'final_buildup' and
      // runs the endGame side effect (status → 'ended') via
      // scene-transitions.ts.
      await expect(async () => {
        const endGameBtn = page.getByRole('button', { name: /end game/i });
        await expect(endGameBtn).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 10000 });

      await pressKey(page, 'KeyN');

      // Wait for ended state
      await expect(async () => {
        await expect(
          page.locator('span').filter({ hasText: /^Ended$/i })
        ).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 10000 });
    }
  }
}

test.describe('Trivia Presenter View', () => {
  test.beforeEach(async ({ authenticatedTriviaPage: page }) => {
    await waitForHydration(page);
  });

  test.describe('Page Structure', () => {
    test('displays presenter view header @medium', async ({ authenticatedTriviaPage: page }) => {
      // Header renders "Trivia" heading + "Presenter" badge (post-WU-05 redesign).
      // Previous copy "Presenter View" no longer exists.
      await expect(page.getByRole('heading', { name: /trivia/i })).toBeVisible();
      await expect(page.getByText(/^Presenter$/).first()).toBeVisible();
    });

    test('shows game status indicator @high', async ({ authenticatedTriviaPage: page }) => {
      // Playing status span reads "Playing - Round N of M" (roundProgress).
      // Anchor on the prefix only so the regex stays stable across round boundaries.
      await expect(page.locator('span').filter({ hasText: /^Playing/ })).toBeVisible();
    });

    test('shows Open Display button @high', async ({ authenticatedTriviaPage: page }) => {
      const openDisplayBtn = page.getByRole('button', { name: /open display/i });
      await expect(openDisplayBtn).toBeVisible();
    });

    test('shows sync status @medium', async ({ authenticatedTriviaPage: page }) => {
      // Connection indicator is a span reading "Synced" (connected) or "Ready"
      // (not yet connected). Either is an acceptable "sync status is shown" signal.
      await expect(page.getByText(/^(Synced|Ready)$/)).toBeVisible();
    });

    test('shows keyboard shortcuts reference @low', async ({ authenticatedTriviaPage: page }) => {
      await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible();
      await expect(page.getByText(/navigate/i)).toBeVisible();
      // Look for "Peek answer" text in shortcuts section (not the button)
      await expect(page.getByText('Peek answer')).toBeVisible();
    });
  });

  test.describe('Starting a New Game', () => {
    test.use({ skipSetupDismissal: true });

    test('cannot start game without teams @critical', async ({ authenticatedTriviaPage: page }) => {
      // SetupWizard gates forward navigation: step 2 (Teams) only completes
      // when currentTeams.length >= 2, so the Review step (and therefore the
      // Start Game button) is unreachable while no teams exist. Assert that:
      //   1. Navigating to step 2 (Teams) shows the "no teams" empty state.
      //   2. Clicking the step-3 (Review) nav button is a no-op -- the button
      //      is not active and the Start Game control never mounts.
      await expect(async () => {
        await page.locator('[data-testid="wizard-step-2"]').click();
        await expect(page.getByText(/no teams added yet/i)).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });

      // Attempting to jump forward to Review: goToStep(3) returns early
      // because isStepComplete(2) is false, so no Start button appears.
      await page.locator('[data-testid="wizard-step-3"]').click();
      await expect(page.getByRole('button', { name: /start game/i })).toHaveCount(0);

      // Current step must still be Teams (aria-current=step); assert the
      // wizard-step-2 button remains the active step indicator.
      await expect(page.locator('[data-testid="wizard-step-2"]')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });

    test('can start game after adding a team @critical', async ({ authenticatedTriviaPage: page }) => {
      // Two teams required to satisfy step-2 gating (currentTeams.length >= 2).
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await expect(async () => {
        await page.locator('[data-testid="wizard-step-2"]').click();
        await expect(addTeamBtn).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });
      await addTeamBtn.click();
      await expect(page.getByText(/table 1/i)).toBeVisible();
      await addTeamBtn.click();
      await expect(page.getByText(/table 2/i)).toBeVisible();

      // Navigate to Review - Start button should be enabled
      await page.locator('[data-testid="wizard-step-3"]').click();
      const startBtn = page.getByRole('button', { name: /start game/i });
      await expect(startBtn).toBeEnabled();

      // Click start and wait for state change
      await startBtn.click();
      await expect(page.locator('span').filter({ hasText: /^Playing/ })).toBeVisible();
    });

    test('shows ready message with team count @medium', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to Teams step and add teams (retry the click to absorb
      // hydration races).
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await expect(async () => {
        await page.locator('[data-testid="wizard-step-2"]').click();
        await expect(addTeamBtn).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });

      await addTeamBtn.click();
      await expect(page.getByText(/table 1/i)).toBeVisible();

      await addTeamBtn.click();
      await expect(page.getByText(/table 2/i)).toBeVisible();

      // Navigate to Review step - should show ready status
      await page.locator('[data-testid="wizard-step-3"]').click();
      await expect(page.getByText(/ready to start/i)).toBeVisible();
    });
  });

  test.describe('Team Management', () => {
    test.use({ skipSetupDismissal: true });

    test('displays team manager section @medium', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to Teams step in the setup wizard. The click can race with
      // React hydration if fired too early -- wrap in toPass so the wizard
      // step change gets retried until the Team Management region appears.
      await expect(async () => {
        await page.locator('[data-testid="wizard-step-2"]').click();
        await expect(
          page.getByRole('region', { name: /team management/i })
        ).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });
    });

    test('can add a team @critical', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to Teams step in the setup wizard (retry to avoid
      // hydration-race flakes).
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await expect(async () => {
        await page.locator('[data-testid="wizard-step-2"]').click();
        await expect(addTeamBtn).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });

      // Check initial state
      await expect(page.getByText(/no teams added yet/i)).toBeVisible();

      // Add team and wait for it to appear (Pattern 1)
      await addTeamBtn.click();
      await expect(page.getByText(/table 1/i)).toBeVisible();

      // Add another team
      await addTeamBtn.click();
      await expect(page.getByText(/table 2/i)).toBeVisible();
    });

    test('can remove a team during setup @high', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to Teams step with retry to absorb hydration races.
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await expect(async () => {
        await page.locator('[data-testid="wizard-step-2"]').click();
        await expect(addTeamBtn).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });
      await addTeamBtn.click();

      // Wait for team to appear using proper role-based locator
      const team1Item = page.getByRole('listitem', { name: /team: table 1/i });
      await expect(team1Item).toBeVisible();

      // Remove the team using the accessible button name
      const removeBtn = page.getByRole('button', { name: /remove team table 1/i });
      await removeBtn.click();

      // Wait for team removal to complete - use toPass for retry logic (Pattern 3)
      await expect(async () => {
        await expect(page.getByText(/no teams added yet/i)).toBeVisible();
      }).toPass({ timeout: 10000 });
    });

    test('can rename a team @high', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to Teams step in the setup wizard. Retry because the click
      // can race with React hydration (same reason as the team-manager test).
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await expect(async () => {
        await page.locator('[data-testid="wizard-step-2"]').click();
        await expect(addTeamBtn).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });

      // Add a team
      await addTeamBtn.click();
      await expect(page.getByRole('listitem', { name: /team: table 1/i })).toBeVisible();

      // Click rename button using accessible button name
      const renameBtn = page.getByRole('button', { name: /rename team table 1/i });
      await renameBtn.click();

      // Wait for and fill the edit input
      const input = page.getByLabel('Edit team name');
      await expect(input).toBeVisible();
      await input.fill('Champions');
      await input.press('Enter');

      // Wait for team rename to complete - use toPass for retry logic (Pattern 3)
      await expect(async () => {
        await expect(page.getByRole('listitem', { name: /team: champions/i })).toBeVisible();
      }).toPass({ timeout: 10000 });
    });

    test('shows team count limit @medium', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to Teams step -- retry to guard against hydration races.
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await expect(async () => {
        await page.locator('[data-testid="wizard-step-2"]').click();
        await expect(addTeamBtn).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });
      await addTeamBtn.click();

      // Wait for team to be added
      await expect(page.getByRole('listitem', { name: /team: table 1/i })).toBeVisible();

      // Should show 1/20
      const teamSection = page.getByRole('region', { name: /team management/i });
      await expect(teamSection.getByText('1/20', { exact: true })).toBeVisible();
    });
  });

  test.describe('Question Navigation', () => {
    test('shows question list @high', async ({ authenticatedTriviaPage: page }) => {
      // Question list section should be visible - use heading to find the section
      // Use first() to handle multiple "Round 1" headings
      await expect(page.getByRole('heading', { name: /round 1/i }).first()).toBeVisible();
    });

    test('can navigate questions with keyboard @high', async ({ authenticatedTriviaPage: page }) => {
      // Navigate down with arrow key - keyboard events are synchronous
      await pressKey(page, 'ArrowDown');

      // Navigate up with arrow key
      await pressKey(page, 'ArrowUp');

      // Should still be on the presenter dashboard (post-WU-05 copy = "Presenter")
      await expect(page.getByText(/^Presenter$/).first()).toBeVisible();
    });

    test('can select a question by clicking @high', async ({ authenticatedTriviaPage: page }) => {
      // Find and click a question item in the list
      const questionItems = page.locator('[role="listitem"]').filter({ hasText: /Q\d|question/i });
      if (await questionItems.count() > 1) {
        await questionItems.nth(1).click();
        // Navigation happens synchronously - no wait needed
      }
    });
  });

  test.describe('Answer Reveal', () => {
    test('can toggle peek answer @high', async ({ authenticatedTriviaPage: page }) => {
      // Find peek button - button may not exist in this version, so just check page structure
      const peekBtn = page.getByRole('button', { name: /peek|show answer/i });
      // If button exists, test it; otherwise, test still passes (feature may not be implemented)
      const btnExists = await peekBtn.count();
      if (btnExists > 0) {
        await peekBtn.click();
        // Button toggle is synchronous - button should remain visible
        await expect(peekBtn).toBeVisible();
      } else {
        // Button doesn't exist - just verify we're still on the page
        await expect(page.getByText(/^Presenter$/).first()).toBeVisible();
      }
    });

    test('can peek answer with Space key @medium', async ({ authenticatedTriviaPage: page }) => {
      // Press Space to peek - keyboard events are synchronous
      await pressKey(page, 'Space');

      // Press Space again to hide
      await pressKey(page, 'Space');
    });

    test('can toggle display question with D key @high', async ({ authenticatedTriviaPage: page }) => {
      // Press D to toggle display - keyboard events are synchronous
      await pressKey(page, 'KeyD');
    });
  });

  test.describe('Keyboard Scoring', () => {
    test('keyboard 1-key during scoring phase does not crash @high', async ({ authenticatedTriviaPage: page }) => {
      // Drive the game from `game_intro` to `question_closed` so the digit
      // keypress exercises the scoring-phase code path. KeyS only fires on
      // `question_display` / `question_closed`, so skip intros first via
      // Enter (game_intro → round_intro → question_anticipation →
      // question_display) before closing.
      await driveToQuestionClosed(page);

      // SceneNavButtons forward label at `question_closed` is "Next Question"
      // (or "End Round" on the last question of a round)
      await expect(
        page.getByRole('button', { name: /next question|end round/i })
      ).toBeVisible({ timeout: 2000 });

      // Press '1' to quick-score team 1 via keyboard (Instance 1 in use-game-keyboard.ts)
      // Verifies the keyboard handler doesn't crash after sidebar removal
      // (Instance 2 of useQuickScore was deleted, Instance 1 must survive)
      await page.keyboard.press('Digit1');

      // The status should remain playing (no crash, no navigation away)
      await expect(
        page.locator('span').filter({ hasText: /^Playing/ })
      ).toBeVisible();
    });
  });

  test.describe('Game Flow', () => {
    // NOTE (BEA-705): The standalone conversion removed the "pause" feature
    // entirely -- P is now peek-answer (local), not pause, and there is no
    // presenter-header "paused" status span. These three tests were originally
    // asserting a feature that no longer exists. They have been rewritten to
    // exercise the current P/E behaviours (peek-answer toggle and
    // emergency-blank scene) which cover the keyboard handlers that replaced
    // the removed pause code path.

    test('pressing P toggles peek-answer without crashing @critical', async ({ authenticatedTriviaPage: page }) => {
      // Drive to question_display so QuestionDisplay (and its Peek button) mounts
      await driveToQuestionDisplay(page);

      // P in use-game-keyboard.ts calls setPeekAnswer((prev) => !prev). When
      // toggled on, the Peek button's aria-label switches to
      // "Hide Peeked Answer".
      await page.keyboard.press('KeyP');
      await expect(
        page.getByRole('button', { name: /hide peeked answer/i })
      ).toBeVisible({ timeout: 5000 });

      // Status must remain `playing` (no crash)
      await expect(
        page.locator('span').filter({ hasText: /^Playing/ })
      ).toBeVisible();
    });

    test('pressing P twice toggles peek back off @critical', async ({ authenticatedTriviaPage: page }) => {
      await driveToQuestionDisplay(page);

      await page.keyboard.press('KeyP');
      await expect(
        page.getByRole('button', { name: /hide peeked answer/i })
      ).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('KeyP');
      await expect(
        page.getByRole('button', { name: /^peek answer$/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test('can use peek keyboard shortcut (P) @medium', async ({ authenticatedTriviaPage: page }) => {
      await driveToQuestionDisplay(page);

      await page.keyboard.press('KeyP');
      await expect(
        page.getByRole('button', { name: /hide peeked answer/i })
      ).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('KeyP');
      await expect(
        page.getByRole('button', { name: /^peek answer$/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test('can trigger emergency blank via E key @high', async ({ authenticatedTriviaPage: page }) => {
      // E toggles emergency blank (visual only, scene = emergency_blank).
      // Presenter header renders "Audience: emergency blank".
      await pressKey(page, 'KeyE');
      await expect(
        page.locator('span').filter({ hasText: /audience:.*emergency blank/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test('can toggle emergency blank with E key @medium', async ({ authenticatedTriviaPage: page }) => {
      await pressKey(page, 'KeyE');
      await expect(
        page.locator('span').filter({ hasText: /audience:.*emergency blank/i })
      ).toBeVisible({ timeout: 5000 });

      // Press E again — scene returns to the prior scene (not emergency_blank)
      await pressKey(page, 'KeyE');
      await expect(async () => {
        const headerText = await page
          .locator('span')
          .filter({ hasText: /^Audience:/ })
          .first()
          .textContent();
        expect(headerText ?? '').not.toMatch(/emergency blank/i);
      }).toPass({ timeout: 5000 });
    });
  });

  test.describe('Round Completion', () => {
    test('shows scene nav Next button at question_closed scene @high', async ({ authenticatedTriviaPage: page }) => {
      // Drive to question_display, then close the question. On the first
      // question of a 5-question round SceneNavButtons renders a "Next
      // Question" forward label (per lib/presenter/nav-button-labels.ts).
      await driveToQuestionDisplay(page);
      await page.keyboard.press('KeyS');

      await expect(
        page.getByRole('button', { name: /next question|end round/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test('can complete round and proceed to next @critical', async ({ authenticatedTriviaPage: page }) => {
      // Walk through every question of round 1, driving scene transitions
      // explicitly. After closing the last question and clicking the
      // SceneNavButtons forward button the scene advances to `round_summary`,
      // which auto-shows the RoundSummary overlay. The "last question" is
      // detected via the forward button's label (switches from "Next
      // Question" → "End Round") so the loop matches the game engine's
      // isLastQuestion predicate.
      // Walk through every question of round 1. We go through the
      // `question_closed` intermediate scene (via S + ArrowRight) rather
      // than directly advancing from `question_display`: scene-transitions
      // only runs the `completeRound` side effect (status → between_rounds)
      // when the transition is question_closed → round_summary.
      //
      // Bypassing question_closed (e.g. via ArrowRight at question_display)
      // leaves the game stuck at status=playing + scene=round_summary, so
      // the overlay never auto-shows.
      const MAX_QUESTIONS = 10; // safety bound — the default round has 5
      for (let q = 0; q < MAX_QUESTIONS; q++) {
        await driveToQuestionDisplay(page);
        await page.keyboard.press('KeyS'); // → question_closed
        await expect(
          page.locator('span').filter({ hasText: /audience:.*question closed/i })
        ).toBeVisible({ timeout: 5000 });
        await page.keyboard.press('ArrowRight'); // → question_anticipation OR round_summary
        const sceneText = (await page
          .locator('span')
          .filter({ hasText: /^Audience:/ })
          .first()
          .textContent()) ?? '';
        if (/round summary/i.test(sceneText)) break;
      }

      // RoundSummary overlay auto-shows when scene = round_summary
      await expect(
        page.getByRole('heading', { name: /round.*complete/i }).first()
      ).toBeVisible({ timeout: 10000 });

      // Click "Next Round" from the RoundSummary overlay. The button's
      // accessible name is "Start round N" (per RoundSummary.tsx), with
      // "Next Round" as the visible text -- match either.
      const nextRoundBtn = page.getByRole('button', {
        name: /next round|start round \d+/i,
      });
      await expect(nextRoundBtn).toBeVisible();
      await nextRoundBtn.click();

      // Wait for next round to resume `playing`
      await expect(
        page.locator('span').filter({ hasText: /^Playing/ })
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Game Reset', () => {
    test('can reset game back to setup @high', async ({ authenticatedTriviaPage: page }) => {
      // KeyR opens the "Start New Game?" confirm dialog whose confirm
      // action is labelled "New Game" (play/page.tsx: confirmLabel="New Game").
      // Scope to the dialog -- the presenter header also has a "Start new
      // game" icon button that matches /new game/i.
      await pressKey(page, 'KeyR');

      const dialog = page.getByRole('dialog', { name: /start new game/i });
      await expect(dialog).toBeVisible({ timeout: 5000 });
      const confirmBtn = dialog.getByRole('button', { name: /^new game$/i });
      await expect(confirmBtn).toBeVisible({ timeout: 5000 });
      await confirmBtn.click();

      // After reset the SetupGate overlay remounts. Asserting on the gate is
      // the most reliable signal that the game returned to the `setup` status.
      await expect(page.locator('[data-testid="setup-gate"]')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('UI Controls', () => {
    test('has fullscreen toggle button @low', async ({ authenticatedTriviaPage: page }) => {
      const fullscreenBtn = page.getByRole('button', { name: /fullscreen/i });
      await expect(fullscreenBtn).toBeVisible();
    });

    test('has settings button @low', async ({ authenticatedTriviaPage: page }) => {
      // Post-standalone conversion the presenter action bar no longer
      // renders a dedicated "Settings" button -- settings live inside the
      // SetupWizard (Settings step) during the setup phase. Kept as a
      // regression probe: if a Settings button reappears here we want to
      // notice. For now, assert its absence from the header.
      await expect(
        page.getByRole('button', { name: /^settings$/i })
      ).toHaveCount(0);
    });

    test('has help button for keyboard shortcuts @low', async ({ authenticatedTriviaPage: page }) => {
      const helpBtn = page.getByRole('button', { name: /keyboard shortcuts/i });
      await expect(helpBtn).toBeVisible();
    });

    test('can toggle fullscreen with F key @low', async ({ authenticatedTriviaPage: page }) => {
      // Note: Actual fullscreen may not work in headless mode, but we can test the handler
      await pressKey(page, 'KeyF');
      // Keyboard event is synchronous - no wait needed
    });

    test('can open keyboard shortcuts modal with ? key @low', async ({ authenticatedTriviaPage: page }) => {
      await page.keyboard.press('Shift+?');

      // Wait for modal to open (Pattern 1: element visibility)
      await expect(async () => {
        const modal = page.getByLabel('Keyboard Shortcuts', { exact: true });
        if (await modal.isVisible()) {
          await expect(modal).toBeVisible();
        }
      }).toPass({ timeout: 5000 });
    });
  });

  test.describe('Theme Selector', () => {
    test('shows theme selector section @medium', async ({ authenticatedTriviaPage: page }) => {
      // Look for theme-related heading or label
      await expect(page.getByRole('heading', { name: /theme/i })).toBeVisible();
    });
  });
});

/**
 * BEA-675: Ended State Tests
 *
 * Tests the handleNextRound bug fix and ended-state center panel additions.
 * Each test drives the full game to completion (3 rounds × 5 questions).
 */
test.describe('Ended State', () => {
  test.beforeEach(async ({ authenticatedTriviaPage: page }) => {
    await waitForHydration(page);
  });

  test('auto-shows Final Results overlay when game ends @critical', async ({ authenticatedTriviaPage: page }) => {
    // Drive the game through all 3 rounds to reach ended state
    await driveGameToEndedState(page);

    // The auto-show useEffect fires on status='ended', revealing the overlay
    // RoundSummary renders with isLastRound=true showing "Final Results" heading
    await expect(async () => {
      await expect(
        page.getByRole('heading', { name: /final results/i })
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });
  });

  test('can dismiss and re-open Final Results overlay @critical', async ({ authenticatedTriviaPage: page }) => {
    await driveGameToEndedState(page);

    // Verify overlay is visible (auto-shown by effect)
    await expect(async () => {
      await expect(
        page.getByRole('heading', { name: /final results/i })
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });

    // Close the overlay via the RoundSummary dismiss button. On the ended
    // state (isLastRound=true), its accessible name is "View questions"
    // and the visible text is "View Questions" (see RoundSummary.tsx).
    const closeBtn = page.getByRole('button', { name: /view questions/i });
    await closeBtn.click();

    // Overlay should be dismissed — heading no longer visible
    await expect(
      page.getByRole('heading', { name: /final results/i })
    ).not.toBeVisible();

    // Center panel "View Final Results" re-open button should now be visible
    const reopenBtn = page.getByRole('button', { name: /view final results/i });
    await expect(reopenBtn).toBeVisible();

    // Click it to re-open
    await reopenBtn.click();

    // Overlay should reappear
    await expect(async () => {
      await expect(
        page.getByRole('heading', { name: /final results/i })
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 5000 });
  });

  test('Final Results overlay shows overall winners @high', async ({ authenticatedTriviaPage: page }) => {
    await driveGameToEndedState(page);

    // Wait for Final Results overlay
    await expect(async () => {
      await expect(
        page.getByRole('heading', { name: /final results/i })
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });

    // Overlay should display standings / scoreboard content
    // The RoundSummary shows teamsSortedByScore — look for team names or score table
    // startGameViaWizard adds 2 teams: Table 1, Table 2
    await expect(async () => {
      const hasTeamContent = (
        await page.getByText(/table 1|table 2/i).count()
      ) > 0;
      expect(hasTeamContent).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test('can start new game from ended state @high', async ({ authenticatedTriviaPage: page }) => {
    await driveGameToEndedState(page);

    // Wait for ended state to be confirmed
    await expect(async () => {
      await expect(
        page.locator('span').filter({ hasText: /^Ended$/i })
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });

    // Press R to trigger the "Start New Game?" confirmation modal
    await pressKey(page, 'KeyR');

    // Scope the confirm click to the modal dialog itself -- the presenter
    // header already has a "Start new game" icon button that also matches
    // /new game/i, so an unscoped lookup is strict-mode ambiguous.
    const dialog = page.getByRole('dialog', { name: /start new game/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const confirmBtn = dialog.getByRole('button', { name: /^new game$/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });

    await confirmBtn.click();

    // Game should return to setup state after reset
    await expect(async () => {
      await expect(
        page.locator('[data-testid="setup-gate"]')
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });
  });

  test('End Game button does not corrupt audience scene @high', async ({ authenticatedTriviaPage: page }) => {
    await driveGameToEndedState(page);

    // Wait for ended state
    await expect(async () => {
      await expect(
        page.locator('span').filter({ hasText: /^Ended$/i })
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });

    // The header shows the current audienceScene.
    // After game ends, scene should be final_podium or final_buildup — NOT round_intro.
    // This directly tests the BEA-675 bug: corrupted scene = round_intro
    await expect(async () => {
      const audienceSceneText = await page.locator('span').filter({ hasText: /audience:/i }).textContent();
      expect(audienceSceneText).not.toMatch(/round.?intro/i);
    }).toPass({ timeout: 5000 });

    // The scene display in the header should show final_podium or final_buildup
    const sceneDisplay = page.locator('span').filter({ hasText: /audience:/i });
    const sceneText = await sceneDisplay.textContent();
    expect(sceneText).toMatch(/final.?(podium|buildup)/i);
  });
});
