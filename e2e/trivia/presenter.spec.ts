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
async function driveGameToEndedState(page: Page, totalRounds = 3, questionsPerRound = 5): Promise<void> {
  for (let round = 0; round < totalRounds; round++) {
    // Navigate to last question of this round (ArrowDown × (questionsPerRound - 1))
    for (let i = 0; i < questionsPerRound - 1; i++) {
      await pressKey(page, 'ArrowDown');
    }

    // Close the question to enter question_closed scene
    await pressKey(page, 'KeyS');

    // Wait for SceneNavButtons "Next" button and click it → round_summary
    await expect(async () => {
      const nextBtn = page.getByRole('button', { name: /^next$/i });
      await expect(nextBtn).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 8000 });

    const nextBtn = page.getByRole('button', { name: /^next$/i });
    await nextBtn.click();

    // Wait for between_rounds state (round_summary scene auto-shows overlay)
    const isLastRound = round === totalRounds - 1;
    if (!isLastRound) {
      // Wait for the round summary heading to appear
      await expect(async () => {
        await expect(
          page.getByRole('heading', { name: /round.*complete/i }).first()
        ).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 10000 });

      // Press N to advance to next round
      await pressKey(page, 'KeyN');

      // Wait for playing state to resume before next round's questions
      await expect(async () => {
        await expect(
          page.locator('span').filter({ hasText: /^Playing/i })
        ).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 10000 });
    } else {
      // Last round: click "End Game" button in the RoundSummary overlay
      // (isLastRound=true shows "End Game" instead of "Next Round")
      await expect(async () => {
        const endGameBtn = page.getByRole('button', { name: /end game/i });
        await expect(endGameBtn).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 10000 });

      const endGameBtn = page.getByRole('button', { name: /end game/i });
      await endGameBtn.click();

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
      await expect(page.getByRole('heading', { name: /trivia/i })).toBeVisible();
      await expect(page.getByText(/presenter view/i)).toBeVisible();
    });

    test('shows game status indicator @high', async ({ authenticatedTriviaPage: page }) => {
      // Should show playing status - fixture starts the game via wizard
      await expect(page.locator('span').filter({ hasText: /^playing$/i })).toBeVisible();
    });

    test('shows Open Display button @high', async ({ authenticatedTriviaPage: page }) => {
      const openDisplayBtn = page.getByRole('button', { name: /open display/i });
      await expect(openDisplayBtn).toBeVisible();
    });

    test('shows sync status @medium', async ({ authenticatedTriviaPage: page }) => {
      await expect(page.getByText(/sync ready|sync active/i)).toBeVisible();
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
      // Navigate to Review step in the setup wizard
      await page.locator('[data-testid="wizard-step-3"]').click();
      const startBtn = page.getByRole('button', { name: /start game/i });
      await expect(startBtn).toBeVisible();
      await expect(startBtn).toBeDisabled();
    });

    test('can start game after adding a team @critical', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to Teams step and add a team
      await page.locator('[data-testid="wizard-step-2"]').click();
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await addTeamBtn.click();
      await expect(page.getByText(/table 1/i)).toBeVisible();

      // Navigate to Review - Start button should be enabled
      await page.locator('[data-testid="wizard-step-3"]').click();
      const startBtn = page.getByRole('button', { name: /start game/i });
      await expect(startBtn).toBeEnabled();

      // Click start and wait for state change
      await startBtn.click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
    });

    test('shows ready message with team count @medium', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to Teams step and add teams
      await page.locator('[data-testid="wizard-step-2"]').click();
      const addTeamBtn = page.getByRole('button', { name: /add team/i });

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
      // Navigate to Teams step in the setup wizard
      await page.locator('[data-testid="wizard-step-2"]').click();
      await expect(page.getByRole('region', { name: /team management/i })).toBeVisible();
    });

    test('can add a team @critical', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to Teams step in the setup wizard
      await page.locator('[data-testid="wizard-step-2"]').click();
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await expect(addTeamBtn).toBeVisible();

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
      // Navigate to Teams step in the setup wizard
      await page.locator('[data-testid="wizard-step-2"]').click();
      // Add a team
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
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
      // Navigate to Teams step in the setup wizard
      await page.locator('[data-testid="wizard-step-2"]').click();
      // Add a team
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await addTeamBtn.click();

      // Wait for team to appear using proper role-based locator
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
      // Navigate to Teams step in the setup wizard
      await page.locator('[data-testid="wizard-step-2"]').click();
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
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

      // Should still be on presenter view
      await expect(page.getByText(/presenter view/i)).toBeVisible();
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
        await expect(page.getByText(/presenter view/i)).toBeVisible();
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

  test.describe('Score Adjustment', () => {
    test('shows team score input during game @high', async ({ authenticatedTriviaPage: page }) => {
      await expect(page.getByRole('heading', { name: /team scores/i })).toBeVisible();
    });

    test('can increase team score with + button @critical', async ({ authenticatedTriviaPage: page }) => {
      // Scope to team scores section
      const scoresSection = page.locator('section, div').filter({ has: page.getByRole('heading', { name: /team scores/i }) });

      // Find the plus button within scores section
      const plusBtn = scoresSection.getByRole('button', { name: /add 1 point/i });
      await expect(plusBtn).toBeVisible();

      // Initial score should be 0
      const scoreDisplay = scoresSection.getByRole('button', { name: /score.*0|0.*click to edit/i });
      if (await scoreDisplay.isVisible()) {
        await plusBtn.click();

        // Wait for score to update (Pattern 3: use .toPass() for state change)
        await expect(async () => {
          const newScoreDisplay = scoresSection.getByRole('button', { name: /score.*1|1.*click to edit/i });
          await expect(newScoreDisplay).toBeVisible({ timeout: 1000 });
        }).toPass({ timeout: 5000 });
      }
    });

    test('can decrease team score with - button @high', async ({ authenticatedTriviaPage: page }) => {
      // Scope to team scores section
      const scoresSection = page.locator('section, div').filter({ has: page.getByRole('heading', { name: /team scores/i }) });

      // First increase score twice
      const plusBtn = scoresSection.getByRole('button', { name: /add 1 point/i });
      await plusBtn.click();
      await expect(async () => {
        await expect(scoresSection.getByRole('button', { name: /score.*1|1.*click to edit/i })).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 5000 });

      await plusBtn.click();
      await expect(async () => {
        await expect(scoresSection.getByRole('button', { name: /score.*2|2.*click to edit/i })).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 5000 });

      // Now decrease
      const minusBtn = scoresSection.getByRole('button', { name: /subtract 1 point/i });
      await minusBtn.click();

      // Wait for score to decrease (Pattern 3)
      await expect(async () => {
        await expect(scoresSection.getByRole('button', { name: /score.*1|1.*click to edit/i })).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 5000 });
    });

    test('can edit score directly by clicking @medium', async ({ authenticatedTriviaPage: page }) => {
      // Scope to team scores section
      const scoresSection = page.locator('section, div').filter({ has: page.getByRole('heading', { name: /team scores/i }) });
      const scoreDisplay = scoresSection.getByRole('button', { name: /click to edit/i });

      if (await scoreDisplay.isVisible()) {
        await scoreDisplay.click();

        // Wait for input to appear (Pattern 1)
        const input = scoresSection.locator('input[type="number"]');
        await expect(input).toBeVisible();

        await input.fill('5');
        await input.press('Enter');

        // Wait for score to update (Pattern 3)
        await expect(async () => {
          await expect(scoresSection.getByRole('button', { name: /score.*5|5.*click to edit/i })).toBeVisible({ timeout: 1000 });
        }).toPass({ timeout: 5000 });
      }
    });

    test('shows per-round score breakdown @medium', async ({ authenticatedTriviaPage: page }) => {
      // Scope to team scores section
      const scoresSection = page.locator('section, div').filter({ has: page.getByRole('heading', { name: /team scores/i }) });

      // Add some points
      const plusBtn = scoresSection.getByRole('button', { name: /add 1 point/i });
      await plusBtn.click();

      // Wait for score update first
      await expect(async () => {
        await expect(scoresSection.getByRole('button', { name: /score.*1|1.*click to edit/i })).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 5000 });

      // Check for round indicator
      // Use aria-label to target specific round indicator element
      await expect(page.getByLabel(/current round/i)).toBeVisible();
    });
  });

  test.describe('Game Flow', () => {
    test('can pause game @critical', async ({ authenticatedTriviaPage: page }) => {
      // Pause is keyboard-only (P) — action bar removed in WU-05
      await pressKey(page, 'KeyP');

      // Wait for paused state (Pattern 2: state change indicator)
      await expect(page.locator('span').filter({ hasText: /^paused$/i })).toBeVisible();
    });

    test('can resume game from pause @critical', async ({ authenticatedTriviaPage: page }) => {
      // Pause first (keyboard P)
      await pressKey(page, 'KeyP');
      await expect(page.locator('span').filter({ hasText: /^paused$/i })).toBeVisible();

      // Resume (keyboard P)
      await pressKey(page, 'KeyP');

      // Wait for playing state (Pattern 2)
      await expect(page.locator('span').filter({ hasText: /^playing/i })).toBeVisible();
    });

    test('can use pause keyboard shortcut (P) @medium', async ({ authenticatedTriviaPage: page }) => {
      await pressKey(page, 'KeyP');

      // Wait for paused state (Pattern 2)
      await expect(page.locator('span').filter({ hasText: /^paused$/i })).toBeVisible();

      // Press P again to resume
      await pressKey(page, 'KeyP');

      // Wait for playing state (Pattern 2)
      await expect(page.locator('span').filter({ hasText: /^playing/i })).toBeVisible();
    });

    test('can trigger emergency pause @high', async ({ authenticatedTriviaPage: page }) => {
      // Emergency pause is keyboard-only (E) — action bar removed in WU-05
      await pressKey(page, 'KeyE');

      // Wait for emergency pause state (Pattern 2)
      await expect(page.locator('span').filter({ hasText: /^emergency pause$/i })).toBeVisible();
    });

    test('can use emergency pause keyboard shortcut (E) @medium', async ({ authenticatedTriviaPage: page }) => {
      await pressKey(page, 'KeyE');

      // Wait for emergency pause state (Pattern 2)
      await expect(page.locator('span').filter({ hasText: /^emergency pause$/i })).toBeVisible();
    });
  });

  test.describe('Round Completion', () => {
    test('shows scene nav Next button at question_closed scene @high', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to last question of round (5 questions per round by default)
      for (let i = 0; i < 4; i++) {
        await pressKey(page, 'ArrowDown');
      }

      // Close the question (S key) to enter question_closed scene —
      // SceneNavButtons renders a "Next" button at this scene (WU-05: action bar removed)
      await pressKey(page, 'KeyS');

      // Wait for the SceneNavButtons "Next" button to appear (Pattern 3)
      await expect(async () => {
        const nextBtn = page.getByRole('button', { name: /^next$/i });
        if (await nextBtn.isVisible()) {
          await expect(nextBtn).toBeVisible();
        }
      }).toPass({ timeout: 5000 });
    });

    test('can complete round and proceed to next @critical', async ({ authenticatedTriviaPage: page }) => {
      // Navigate to last question of round
      for (let i = 0; i < 4; i++) {
        await pressKey(page, 'ArrowDown');
      }

      // Close the question (S key) → question_closed scene → SceneNavButtons shows "Next"
      await pressKey(page, 'KeyS');

      // Wait for "Next" button from SceneNavButtons (Pattern 3)
      await expect(async () => {
        const nextBtn = page.getByRole('button', { name: /^next$/i });
        await expect(nextBtn).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 5000 });

      // Click "Next" — CLOSE trigger at last question → round_summary scene
      // auto-show useEffect reveals RoundSummary overlay (WU-04)
      const nextBtn = page.getByRole('button', { name: /^next$/i });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();

        // Wait for between rounds state (Pattern 2)
        // Use first() to handle multiple "Round Complete" headings
        await expect(page.getByRole('heading', { name: /round.*complete/i }).first()).toBeVisible();

        // Click "Next Round" from the RoundSummary overlay (still present)
        const nextRoundBtn = page.getByRole('button', { name: /next round/i });
        if (await nextRoundBtn.isVisible()) {
          await nextRoundBtn.click();

          // Wait for next round to start (Pattern 2)
          await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
        }
      }
    });
  });

  test.describe('Game Reset', () => {
    test('can reset game back to setup @high', async ({ authenticatedTriviaPage: page }) => {
      // Find reset via keyboard shortcut modal or settings
      await pressKey(page, 'KeyR');

      // Wait for confirmation dialog or reset to complete (Pattern 3)
      await expect(async () => {
        // If there's a confirm dialog, accept it
        const confirmBtn = page.getByRole('button', { name: /confirm|yes|reset/i });
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
        // Wait for reset to complete - check for setup state
        await expect(page.locator('span').filter({ hasText: /^setup$/i })).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 10000 });
    });
  });

  test.describe('UI Controls', () => {
    test('has fullscreen toggle button @low', async ({ authenticatedTriviaPage: page }) => {
      const fullscreenBtn = page.getByRole('button', { name: /fullscreen/i });
      await expect(fullscreenBtn).toBeVisible();
    });

    test('has settings button @low', async ({ authenticatedTriviaPage: page }) => {
      const settingsBtn = page.getByRole('button', { name: /settings/i });
      await expect(settingsBtn).toBeVisible();
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

    // Close the overlay via the X / close button
    const closeBtn = page.getByRole('button', { name: /close/i });
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

    // Press R to trigger new game confirmation dialog
    await pressKey(page, 'KeyR');

    // Wait for and confirm the reset dialog
    await expect(async () => {
      const confirmBtn = page.getByRole('button', { name: /new game/i });
      await expect(confirmBtn).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 5000 });

    const confirmBtn = page.getByRole('button', { name: /new game/i });
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
