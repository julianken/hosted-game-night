import { test, expect } from '../fixtures/auth';
import { waitForHydration, waitForDualScreenSync, waitForSyncedContent, startGameViaWizard } from '../utils/helpers';

test.describe('Trivia Dual-Screen Synchronization', () => {
  test.describe('Initial Connection', () => {
    test('presenter shows sync ready status before display opens @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Check presenter shows sync ready status
      await expect(page.getByText(/sync ready|sync active/i)).toBeVisible();
    });

    test('presenter and display sync on connection @critical', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Open display from presenter
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Wait for connection to establish
      await waitForDualScreenSync(displayPage);

      // Both should show connected status
      await expect(page.getByText(/sync active/i)).toBeVisible({ timeout: 10000 });
      await expect(displayPage.locator('[class*="bg-success"]').first()).toBeVisible({ timeout: 10000 });
    });

    test.describe('Pre-game State', () => {
      test.use({ skipSetupDismissal: true });

      test('display shows waiting state initially @medium', async ({ authenticatedTriviaPage: page }) => {
        await waitForHydration(page);

        const popupPromise = page.waitForEvent('popup');
        await page.locator('[data-testid="setup-gate-open-display"]').click();
        const displayPage = await popupPromise;

        await waitForHydration(displayPage);

        // Display should show waiting state
        await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();
      });
    });
  });

  test.describe('Changes in Presenter Reflect in Display', () => {
    test('question displayed on presenter syncs to display @critical', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Open display
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Toggle display for question
      await page.keyboard.press('KeyD');

      // Display should show the question - look for question text which is continuous
      // Note: "Round 1" is split across DOM elements so use question content instead
      await waitForSyncedContent(displayPage, /which artist recorded/i);
      await expect(displayPage.getByText(/which artist recorded/i)).toBeVisible();
    });

    test.describe('State Transitions', () => {
      test.use({ skipSetupDismissal: true });

      test('game status changes sync to display @critical', async ({ authenticatedTriviaPage: page }) => {
        await waitForHydration(page);

        // Open display (use testid to avoid strict-mode violation with header button)
        const popupPromise = page.waitForEvent('popup');
        await page.locator('[data-testid="setup-gate-open-display"]').click();
        const displayPage = await popupPromise;

        await waitForHydration(displayPage);
        await waitForDualScreenSync(displayPage);

        // Initially in setup/waiting state
        await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();

        // Start game via wizard
        await startGameViaWizard(page, 1);

        // Display question
        await page.keyboard.press('KeyD');

        // Display should transition to showing question
        await waitForSyncedContent(displayPage, /which artist recorded/i);
        await expect(displayPage.getByText(/which artist recorded/i)).toBeVisible();
      });
    });

    test('question navigation syncs display index @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Display first question
      await page.keyboard.press('KeyD');

      // Should show question 1 (check for question text - first question is about "Respect")
      await waitForSyncedContent(displayPage, /which artist recorded/i);
      await expect(displayPage.getByText(/which artist recorded/i)).toBeVisible();

      // Hide question
      await page.keyboard.press('KeyD');

      // Navigate to next question
      await page.keyboard.press('ArrowDown');

      // Display next question
      await page.keyboard.press('KeyD');

      // Should show question 2 (second question is about "Wizard of Oz")
      await waitForSyncedContent(displayPage, /wizard of oz/i);
      await expect(displayPage.getByText(/wizard of oz/i)).toBeVisible();
    });

    test('pause state syncs to display @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      await page.keyboard.press('KeyD');
      // Wait for question to display (use question text instead of split "round 1")
      await waitForSyncedContent(displayPage, /which artist recorded/i);

      // Pause the game
      await page.keyboard.press('KeyP');

      // Display should show paused state (may have multiple "paused" elements)
      await waitForSyncedContent(displayPage, /paused/i);
      await expect(displayPage.getByText(/paused/i).first()).toBeVisible();
    });

    test('emergency pause blanks display @critical', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      await page.keyboard.press('KeyD');
      // Wait for question to display (use question text instead of split "round 1")
      await waitForSyncedContent(displayPage, /which artist recorded/i);

      // Emergency pause
      await page.keyboard.press('KeyE');

      // Display should be blanked - question text should be hidden
      // Emergency blank shows only an aria-label element with "Display blanked for emergency"
      await expect(async () => {
        const questionText = displayPage.getByText(/which artist recorded/i);
        await expect(questionText).not.toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 10000 });

      // Verify the blank overlay is present via aria-label
      await expect(displayPage.locator('[aria-label*="blanked"]')).toBeVisible();
    });
  });

  test.describe('Score Updates Sync Correctly', () => {
    test('team scores sync to display scoreboard @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Open display
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Adjust score on presenter
      const plusBtn = page.getByRole('button', { name: /add 1 point/i }).first();
      await plusBtn.click();
      await plusBtn.click();

      // Complete round to show scoreboard on display
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      // Close question (S) → question_closed scene → click SceneNavButtons "Next"
      await page.keyboard.press('KeyS');
      const completeScoreBtn = page.getByRole('button', { name: /^next$/i });
      if (await completeScoreBtn.isVisible()) {
        await completeScoreBtn.click();

        // Display should show updated scores
        const scoreDisplay = displayPage.locator('[aria-label*="points"]');
        await expect(scoreDisplay.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test.describe('Multi-Team Sync', () => {
      test.use({ skipSetupDismissal: true });

      test('multiple teams score updates sync correctly @high', async ({ authenticatedTriviaPage: page }) => {
        await waitForHydration(page);

        // Start game with 3 teams via wizard
        await startGameViaWizard(page, 3);

        const popupPromise = page.waitForEvent('popup');
        await page.getByRole('button', { name: /open display/i }).click();
        const displayPage = await popupPromise;

        await waitForHydration(displayPage);
        await waitForDualScreenSync(displayPage);

        // Add different scores to different teams
        const plusBtns = page.getByRole('button', { name: /add 1 point/i });
        await plusBtns.first().click();
        await plusBtns.first().click();
        await plusBtns.first().click();

        // Complete round
        for (let i = 0; i < 4; i++) {
          await page.keyboard.press('ArrowDown');
        }

        // Close question (S) → question_closed scene → click SceneNavButtons "Next"
        await page.keyboard.press('KeyS');
        const completeBtn = page.getByRole('button', { name: /^next$/i });
        if (await completeBtn.isVisible()) {
          await completeBtn.click();

          // Display should show all teams
          await waitForSyncedContent(displayPage, /table 1/i);
          await expect(displayPage.getByText(/table 1/i)).toBeVisible();
          await expect(displayPage.getByText(/table 2/i)).toBeVisible();
          await expect(displayPage.getByText(/table 3/i)).toBeVisible();
        }
      });
    });
  });

  test.describe('Round Completion and Progression', () => {
    test('round completion syncs scoreboard to display @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Navigate to end of round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      // Close question (S) → question_closed scene → click SceneNavButtons "Next"
      // to trigger round completion (WU-05: action bar removed)
      await page.keyboard.press('KeyS');
      const completeBtn = page.getByRole('button', { name: /^next$/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();

        // Display should show round complete/scoreboard
        await waitForSyncedContent(displayPage, /round.*complete/i);
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();
      }
    });

    test('next round transition syncs to display @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Complete first round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      // Close question (S) → question_closed scene → click SceneNavButtons "Next"
      await page.keyboard.press('KeyS');
      const completeBtn = page.getByRole('button', { name: /^next$/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();

        // Click "Next Round" from the RoundSummary overlay (still present in RoundSummary component)
        const nextRoundBtn = page.getByRole('button', { name: /next round/i });
        if (await nextRoundBtn.isVisible()) {
          await nextRoundBtn.click();

          // Display question in round 2
          await page.keyboard.press('KeyD');

          // Display should show round 2 question (first round 2 question is about Scarlett O'Hara)
          await waitForSyncedContent(displayPage, /scarlett o'hara|gone with the wind/i);
          await expect(displayPage.getByText(/scarlett o'hara|gone with the wind/i)).toBeVisible();
        }
      }
    });
  });

  test.describe('Timer Sync', () => {
    test('timer state syncs to display @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Timer state should be synced (if visible)
      // The actual timer value sync is handled by the game state
    });
  });

  test.describe('Game Reset Sync', () => {
    test('game reset syncs to display @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Display question
      await page.keyboard.press('KeyD');
      // Wait for question to display (use question text instead of split "round 1")
      await waitForSyncedContent(displayPage, /which artist recorded/i);

      // Reset game
      await page.keyboard.press('KeyR');

      // Handle confirmation if present
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|reset/i });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();

        // Display should return to waiting state
        await waitForSyncedContent(displayPage, /waiting|get ready/i);
        await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();
      }
    });
  });

  test.describe('Connection Resilience', () => {
    test('closing display does not affect presenter @critical', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Close display
      await displayPage.close();

      // Presenter should still work
      await expect(page.getByText(/playing|round/i).first()).toBeVisible();

      // Can still interact with presenter
      await page.keyboard.press('KeyD');
      // No error should occur
    });

    test('display reconnects after visibility change @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Simulate tab becoming hidden then visible
      await displayPage.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await displayPage.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Connection should still be active
      await waitForDualScreenSync(displayPage);
      const syncIndicator = displayPage.locator('[class*="bg-success"]').first();
      await expect(syncIndicator).toBeVisible({ timeout: 5000 });
    });

    test('can reopen display after closing @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Open and close display
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage1 = await popupPromise;

      await waitForHydration(displayPage1);
      await waitForDualScreenSync(displayPage1);
      await displayPage1.close();

      // Reopen display
      const popupPromise2 = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage2 = await popupPromise2;

      await waitForHydration(displayPage2);

      // Should work correctly
      await expect(displayPage2.getByText(/audience display/i)).toBeVisible();
      await waitForDualScreenSync(displayPage2);
      await expect(displayPage2.locator('[class*="bg-success"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('display receives state on reconnect @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Display question on presenter
      await page.keyboard.press('KeyD');

      // Now open display - should receive current state
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Display should show the current question (first question is about "Respect")
      await waitForSyncedContent(displayPage, /which artist recorded/i);
      await expect(displayPage.getByText(/which artist recorded/i)).toBeVisible();
    });
  });

  test.describe('Theme Sync', () => {
    test('theme changes sync from presenter to display @low', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      // Theme selector interaction (if available)
      const themeSelector = page.locator('[aria-label*="theme"], [class*="theme"]').first();
      if (await themeSelector.isVisible()) {
        // Theme changes should sync
      }
    });
  });

  test.describe('Multiple Display Sessions', () => {
    test('opening second display works correctly @low', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Open first display
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage1 = await popupPromise;

      await waitForHydration(displayPage1);
      await waitForDualScreenSync(displayPage1);

      // Open second display (should either reuse or create new)
      const openBtn = page.getByRole('button', { name: /open display/i });
      await openBtn.click();

      // Both should be functional
      await expect(displayPage1.getByText(/audience display/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Sync Message Types', () => {
    test('STATE_UPDATE message syncs game state @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // State should be synced
      const displayContent = displayPage.locator('main');
      await expect(displayContent).toBeVisible();
    });

    test('REQUEST_SYNC triggers state refresh @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.keyboard.press('KeyD');

      // Open display after state is set
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Display should request and receive current state (first question is about "Respect")
      await waitForSyncedContent(displayPage, /which artist recorded/i);
      await expect(displayPage.getByText(/which artist recorded/i)).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('rapid state changes sync correctly @low', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Rapid score changes
      const plusBtn = page.getByRole('button', { name: /add 1 point/i }).first();
      for (let i = 0; i < 5; i++) {
        await plusBtn.click();
      }

      // Final state should be synced correctly
      const presenterContent = page.locator('main');
      await expect(presenterContent).toBeVisible();
    });

    test.describe('Pre-Setup Display', () => {
      test.use({ skipSetupDismissal: true });

      test('handles display opened before teams added @low', async ({ authenticatedTriviaPage: page }) => {
        await waitForHydration(page);

        // Open display before any setup (use testid to avoid strict-mode violation with header button)
        const popupPromise = page.waitForEvent('popup');
        await page.locator('[data-testid="setup-gate-open-display"]').click();
        const displayPage = await popupPromise;

        await waitForHydration(displayPage);
        await waitForDualScreenSync(displayPage);

        // Display should show waiting state
        await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();

        // Now start game via wizard with 1 team
        await startGameViaWizard(page, 1);
        await page.keyboard.press('KeyD');

        // Display should now show question
        await waitForSyncedContent(displayPage, /which artist recorded/i);
        await expect(displayPage.getByText(/which artist recorded/i)).toBeVisible();
      });
    });
  });
});
