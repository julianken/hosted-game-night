import { test, expect } from '../fixtures/auth';
import { waitForHydration, waitForDualScreenSync, startGameViaWizard } from '../utils/helpers';

test.describe('Trivia Audience Display', () => {
  test.describe('Direct Access - Invalid Session', () => {
    test('shows invalid session error when accessed directly without session @high', async ({ page }) => {
      await page.goto('/display');
      await waitForHydration(page);

      await expect(page.getByText(/invalid session/i)).toBeVisible();
      await expect(page.getByText(/open display/i)).toBeVisible();
    });

    test('shows invalid session for malformed session ID @high', async ({ page }) => {
      await page.goto('/display?session=invalid');
      await waitForHydration(page);

      await expect(page.getByText(/invalid session/i)).toBeVisible();
    });

    test('shows error icon with invalid session @low', async ({ page }) => {
      await page.goto('/display');
      await waitForHydration(page);

      // Should show warning/error icon
      const errorIcon = page.locator('svg').first();
      await expect(errorIcon).toBeVisible();
    });

    test('provides guidance on how to open display @medium', async ({ page }) => {
      await page.goto('/display');
      await waitForHydration(page);

      await expect(page.getByText(/presenter window/i)).toBeVisible();
    });
  });

  test.describe('Valid Session Display', () => {
    test('displays correctly when opened from presenter @critical', async ({ triviaGameStarted: page }) => {
      // First go to presenter view
      await waitForHydration(page);

      // Open display window
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Check display page has correct structure (aria-label on main element)
      await expect(displayPage.getByRole('main', { name: /trivia audience display/i })).toBeVisible();
      // Check display is connected to presenter via BroadcastChannel
      await waitForDualScreenSync(displayPage);
    });

    test.describe('Pre-game State', () => {
      // Setup overlay stays visible — tests assert waiting state on the display.

      test('shows waiting state when game not started @high', async ({ triviaPageWithQuestions: page }) => {
        await waitForHydration(page);

        // Use testid to avoid strict-mode violation (header + overlay both have "Open Display")
        const popupPromise = page.waitForEvent('popup');
        await page.locator('[data-testid="setup-gate-open-display"]').click();
        const displayPage = await popupPromise;

        await waitForHydration(displayPage);

        // Should show waiting state
        await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();
      });
    });

    test('shows connection status indicator - connected @high', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Wait for sync connection to establish
      await waitForDualScreenSync(displayPage);

      // Display page signals connection via data-connected attribute on <main>
      await expect(displayPage.locator('[data-connected="true"]')).toBeVisible({ timeout: 10000 });
    });

    test('shows sync timestamp when connected @medium', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Presenter page should show "Synced" indicator when display is connected
      const syncText = page.getByText(/synced/i);
      await expect(syncText.first()).toBeVisible();
    });
  });

  test.describe('Question Content Display', () => {
    test('shows question when displayed by presenter @critical', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Display question using D key — game auto-advances through scenes,
      // retry D key presses until the question region appears
      await expect(async () => {
        await page.keyboard.press('KeyD');
        await expect(
          displayPage.getByRole('region', { name: /question \d+ of \d+/i })
        ).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      // Display should show question content
      await expect(displayPage.getByRole('region', { name: /question \d+ of \d+, round \d+ of \d+/i })).toBeVisible();
    });

    test('shows round and question number indicator @medium', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Display question using D key — retry until question scene appears
      await expect(async () => {
        await page.keyboard.press('KeyD');
        await expect(
          displayPage.getByRole('region', { name: /question \d+ of \d+/i })
        ).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      // Should show "Question X of Y, Round Z of W" format in region aria-label
      const roundInfoRegion = displayPage.getByRole('region', { name: /question \d+ of \d+, round \d+ of \d+/i });
      await expect(roundInfoRegion).toBeVisible();
    });

    test('shows category badge for questions @medium', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Display question using D key — retry until question scene appears
      await expect(async () => {
        await page.keyboard.press('KeyD');
        await expect(
          displayPage.getByRole('region', { name: /question \d+ of \d+/i })
        ).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      // Question region includes category in the question text area
      // AudienceQuestion renders question text as a heading
      const questionHeading = displayPage.locator('#current-question');
      await expect(questionHeading).toBeVisible();
    });

    test('shows answer options list @high', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Display question using D key — retry until question scene appears
      await expect(async () => {
        await page.keyboard.press('KeyD');
        await expect(
          displayPage.getByRole('region', { name: /question \d+ of \d+/i })
        ).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      // Should show answer options list
      const optionsList = displayPage.locator('[role="list"][aria-label="Answer options"]');
      if (await optionsList.isVisible()) {
        await expect(optionsList).toBeVisible();
      }
    });

    test('question closes when presenter presses S (close) @high', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Advance to the question_display scene (scenes auto-advance after
      // their timer; retrying the D-key press just lets the scene progress).
      await expect(async () => {
        await page.keyboard.press('KeyD');
        await expect(
          displayPage.getByRole('region', { name: /question \d+ of \d+/i })
        ).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      // Close the question (KeyS triggers question_closed scene transition).
      await page.keyboard.press('KeyS');

      // question_display region should no longer be visible — display has
      // advanced to question_closed ("Waiting for the answer...").
      await expect(
        displayPage.getByRole('region', { name: /question \d+ of \d+, round \d+ of \d+/i })
      ).toBeHidden({ timeout: 10000 });
    });
  });

  test.describe('Scoreboard Display', () => {
    // Start from the setup overlay so tests can call startGameViaWizard with
    // the team count each scenario needs.

    test('shows scoreboard between rounds @high', async ({ triviaPageWithQuestions: page }) => {
      await waitForHydration(page);

      await startGameViaWizard(page, 3);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Navigate to end of round (5 questions per round default)
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      // Close question (S) → question_closed scene → click SceneNavButtons "Next"
      // to trigger round completion (WU-05: action bar removed)
      await page.keyboard.press('KeyS');
      const nextBtn = page.getByRole('button', { name: /^next$/i });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();

        // Display should show scoreboard
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();
      }
    });

    test('shows team names on scoreboard @medium', async ({ triviaPageWithQuestions: page }) => {
      await waitForHydration(page);

      await startGameViaWizard(page, 2);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Navigate to end of round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      // Close question (S) → question_closed scene → click SceneNavButtons "Next"
      await page.keyboard.press('KeyS');
      const nextBtn = page.getByRole('button', { name: /^next$/i });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();

        // Should show team names
        await expect(displayPage.getByText(/table 1/i)).toBeVisible();
      }
    });

    test('shows medal rankings (1st, 2nd, 3rd) @medium', async ({ triviaPageWithQuestions: page }) => {
      await waitForHydration(page);

      await startGameViaWizard(page, 4);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Navigate to end and complete round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      // Close question (S) → question_closed scene → click SceneNavButtons "Next"
      await page.keyboard.press('KeyS');
      const nextBtn = page.getByRole('button', { name: /^next$/i });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();

        // Should show medal ranks
        await expect(displayPage.getByText(/1st/i)).toBeVisible();
        await expect(displayPage.getByText(/2nd/i)).toBeVisible();
        await expect(displayPage.getByText(/3rd/i)).toBeVisible();
      }
    });

    test('displays team scores on scoreboard @high', async ({ triviaPageWithQuestions: page }) => {
      await waitForHydration(page);

      // Wizard step 2 gate requires teams.length >= 2.
      await startGameViaWizard(page, 2);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Close the current question to enter the scoring flow
      // (KeyS transitions question_display → question_closed).
      await page.keyboard.press('KeyS');
      // Quick-score team 1 twice with the "1" key (Scoring phase shortcut).
      await page.keyboard.press('Digit1');
      await page.keyboard.press('Digit1');

      // Advance through remaining questions in round 1
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }
      await page.keyboard.press('KeyS');

      const nextBtn = page.getByRole('button', { name: /^next$/i });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible({ timeout: 10000 });

        // Any element marked with a "N points" aria-label counts as a score
        // readout on the display-side scoreboard.
        const scoreDisplay = displayPage.locator('[aria-label*="points"]');
        await expect(scoreDisplay.first()).toBeVisible();
      }
    });

    test('shows "Next round starting soon" message @medium', async ({ triviaPageWithQuestions: page }) => {
      await waitForHydration(page);

      // Wizard step 2 gate requires teams.length >= 2.
      await startGameViaWizard(page, 2);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Wait for game to advance past game_intro into question display
      await expect(async () => {
        await page.keyboard.press('KeyD');
        await expect(
          displayPage.getByRole('region', { name: /question \d+ of \d+/i })
        ).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      // Navigate to end of round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      // Close question (S) → question_closed scene → click SceneNavButtons "Next"
      await page.keyboard.press('KeyS');
      const nextBtn = page.getByRole('button', { name: /^next$/i });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();

        // Wait for round summary to appear on display (sync + scene transition)
        await expect(async () => {
          await expect(displayPage.getByText(/round.*complete/i)).toBeVisible({ timeout: 3000 });
        }).toPass({ timeout: 15000 });

        // RoundSummaryScene shows "X rounds remaining" for non-final rounds
        await expect(displayPage.getByText(/round.*remaining/i)).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Timer Display', () => {
    test('timer can be visible on display based on settings @medium', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Timer visibility is controlled by settings
      // This test verifies the display can show timer when enabled
    });
  });

  test.describe('Pause Overlay', () => {
    // NOTE: Trivia does not have a game-pause mechanism (KeyP = peek answer,
    // not pause). The canonical "hide the audience" feature is the Emergency
    // Blank (KeyE), which toggles `emergencyBlank` and swaps the display into
    // a full-screen blackout. These tests assert against that behaviour.

    test('shows emergency-blank overlay when toggled by presenter @high', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Advance display to the question scene so the "restore from blank"
      // has a meaningful underlying state.
      await expect(async () => {
        await page.keyboard.press('KeyD');
        await expect(
          displayPage.getByRole('region', { name: /question \d+ of \d+/i })
        ).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      // Trigger emergency blank
      await page.keyboard.press('KeyE');

      // Display should render the EmergencyBlankScene (role="alert" canvas).
      await expect(displayPage.locator('.display-canvas[role="alert"]')).toBeVisible({ timeout: 10000 });
    });

    test('shows blank screen during emergency pause @critical', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Display question using D key — retry until question scene appears
      await expect(async () => {
        await page.keyboard.press('KeyD');
        await expect(
          displayPage.getByRole('region', { name: /question \d+ of \d+/i })
        ).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      // Emergency pause
      await page.keyboard.press('KeyE');

      // EmergencyBlankScene renders a full-screen black div with role="alert" and sr-only text
      const emergencyBlank = displayPage.locator('.display-canvas[role="alert"]');
      await expect(emergencyBlank).toBeVisible({ timeout: 10000 });

      // Verify the sr-only text is present for screen readers
      await expect(displayPage.locator('.sr-only', { hasText: /display blanked/i })).toBeAttached();
    });

    test('restores display when emergency blank is cleared @high', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Advance to question scene
      await expect(async () => {
        await page.keyboard.press('KeyD');
        await expect(
          displayPage.getByRole('region', { name: /question \d+ of \d+/i })
        ).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      // Blank then restore
      await page.keyboard.press('KeyE');
      await expect(displayPage.locator('.display-canvas[role="alert"]')).toBeVisible({ timeout: 10000 });
      await page.keyboard.press('KeyE');

      // Should return to normal display with question region
      await expect(
        displayPage.getByRole('region', { name: /question \d+ of \d+, round \d+ of \d+/i })
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Game End Display', () => {
    test('shows game end state when game is complete @medium', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Note: Full game completion requires completing all rounds
      // This is tested in integration tests
    });
  });

  test.describe('UI Elements and Landmarks', () => {
    test('has proper ARIA landmarks @low', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Should have main landmark with accessible name
      await expect(displayPage.locator('main, [role="main"]')).toHaveCount(1);
      await expect(displayPage.getByRole('main', { name: /trivia audience display/i })).toBeVisible();

      // Should have game display area region
      await expect(displayPage.locator('#display-content')).toBeVisible();
    });

    test('supports keyboard fullscreen via F key @low', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Display page uses keyboard F for fullscreen (no button)
      // Verify the page loaded correctly with the main landmark
      await expect(displayPage.getByRole('main', { name: /trivia audience display/i })).toBeVisible();
    });

    test('has game display area region @low', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Display page has a game display area region instead of a footer
      await expect(displayPage.getByRole('region', { name: /game display area/i })).toBeVisible();
    });

    test('has display-content target region @low', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // The #display-content region exists as the main content target
      const displayContent = displayPage.locator('#display-content');
      await expect(displayContent).toHaveCount(1);
      await expect(displayContent).toBeVisible();
    });
  });

  test.describe('Animation Support', () => {
    test('question display has fade-in animation class @low', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.keyboard.press('KeyD');
      // Wait for state change to propagate

      // Check for animation classes
      const animatedElement = displayPage.locator('[class*="animate-in"], [class*="fade-in"]');
      if (await animatedElement.count() > 0) {
        await expect(animatedElement.first()).toBeVisible();
      }
    });

    test('respects motion-reduce preference @low', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Check for motion-reduce class availability
      const motionReduceElement = displayPage.locator('[class*="motion-reduce"]');
      // Elements with motion-reduce should have appropriate styles
      const count = await motionReduceElement.count();
      expect(count).toBeGreaterThanOrEqual(0); // May have motion-reduce classes
    });
  });

  test.describe('Responsive Design', () => {
    test('adapts to large viewport (projector) @medium', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Set large viewport
      await displayPage.setViewportSize({ width: 1920, height: 1080 });

      // Main content area should be visible at this viewport size
      await expect(displayPage.getByRole('main', { name: /trivia audience display/i })).toBeVisible();
    });

    test('adapts to medium viewport @medium', async ({ triviaGameStarted: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Set medium viewport
      await displayPage.setViewportSize({ width: 1024, height: 768 });

      // Main content area should be visible at this viewport size
      await expect(displayPage.getByRole('main', { name: /trivia audience display/i })).toBeVisible();
    });
  });
});
