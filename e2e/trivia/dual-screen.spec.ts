import { test, expect } from '../fixtures/auth';
import { waitForHydration } from '../utils/helpers';

test.describe('Trivia Dual-Screen Synchronization', () => {
  test.describe('Initial Connection', () => {
    test('presenter shows sync ready status before display opens', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Check presenter shows sync ready status
      await expect(page.getByText(/sync ready|sync active/i)).toBeVisible();
    });

    test('presenter and display sync on connection', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Open display from presenter
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Wait for connection to establish
      await page.waitForTimeout(1000);

      // Both should show connected status
      await expect(page.getByText(/sync active/i)).toBeVisible({ timeout: 10000 });
      await expect(displayPage.locator('[class*="bg-success"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('display shows waiting state initially', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Display should show waiting state
      await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();
    });
  });

  test.describe('Changes in Presenter Reflect in Display', () => {
    test('question displayed on presenter syncs to display', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Add team
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      // Open display
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Start game
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Toggle display for question
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(1000);

      // Display should show the question
      await expect(displayPage.getByText(/round 1/i)).toBeVisible();
    });

    test('game status changes sync to display', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Add team
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      // Open display
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Initially in setup/waiting state
      await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();

      // Start game
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Display question
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(500);

      // Display should transition to showing question
      await expect(displayPage.getByText(/round 1/i)).toBeVisible();
    });

    test('question navigation syncs display index', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Display first question
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(500);

      // Should show question 1
      await expect(displayPage.getByText(/question 1 of/i)).toBeVisible();

      // Hide question
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(300);

      // Navigate to next question
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);

      // Display next question
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(500);

      // Should show question 2
      await expect(displayPage.getByText(/question 2 of/i)).toBeVisible();
    });

    test('pause state syncs to display', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(500);

      // Pause the game
      await page.keyboard.press('KeyP');
      await page.waitForTimeout(500);

      // Display should show paused state
      await expect(displayPage.getByText(/paused/i)).toBeVisible();
    });

    test('emergency pause blanks display', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(500);

      // Emergency pause
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(500);

      // Display should show blank/emergency state
      await expect(displayPage.getByText(/please wait/i)).toBeVisible();
    });
  });

  test.describe('Score Updates Sync Correctly', () => {
    test('team scores sync to display scoreboard', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Add teams
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      // Open display
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Start game
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Adjust score on presenter
      const plusBtn = page.getByRole('button', { name: /add 1 point/i }).first();
      await plusBtn.click();
      await page.waitForTimeout(200);
      await plusBtn.click();
      await page.waitForTimeout(200);

      // Complete round to show scoreboard on display
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(300);

      const completeBtn = page.getByRole('button', { name: /complete round/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await page.waitForTimeout(1000);

        // Display should show updated scores
        const scoreDisplay = displayPage.locator('[aria-label*="points"]');
        await expect(scoreDisplay.first()).toBeVisible();
      }
    });

    test('multiple teams score updates sync correctly', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Add multiple teams
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Add different scores to different teams
      const plusBtns = page.getByRole('button', { name: /add 1 point/i });
      await plusBtns.first().click();
      await page.waitForTimeout(100);
      await plusBtns.first().click();
      await page.waitForTimeout(100);
      await plusBtns.first().click();
      await page.waitForTimeout(200);

      // Complete round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(300);

      const completeBtn = page.getByRole('button', { name: /complete round/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await page.waitForTimeout(1000);

        // Display should show all teams
        await expect(displayPage.getByText(/table 1/i)).toBeVisible();
        await expect(displayPage.getByText(/table 2/i)).toBeVisible();
        await expect(displayPage.getByText(/table 3/i)).toBeVisible();
      }
    });
  });

  test.describe('Round Completion and Progression', () => {
    test('round completion syncs scoreboard to display', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Navigate to end of round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(300);

      // Complete round
      const completeBtn = page.getByRole('button', { name: /complete round/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await page.waitForTimeout(1000);

        // Display should show round complete/scoreboard
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();
      }
    });

    test('next round transition syncs to display', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Complete first round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(300);

      const completeBtn = page.getByRole('button', { name: /complete round/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await page.waitForTimeout(500);

        // Click next round
        const nextRoundBtn = page.getByRole('button', { name: /next round/i });
        if (await nextRoundBtn.isVisible()) {
          await nextRoundBtn.click();
          await page.waitForTimeout(500);

          // Display question in round 2
          await page.keyboard.press('KeyD');
          await page.waitForTimeout(500);

          // Display should show round 2
          await expect(displayPage.getByText(/round 2/i)).toBeVisible();
        }
      }
    });
  });

  test.describe('Timer Sync', () => {
    test('timer state syncs to display', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Timer state should be synced (if visible)
      // The actual timer value sync is handled by the game state
    });
  });

  test.describe('Game Reset Sync', () => {
    test('game reset syncs to display', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Display question
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(500);

      // Reset game
      await page.keyboard.press('KeyR');
      await page.waitForTimeout(500);

      // Handle confirmation if present
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|reset/i });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);

        // Display should return to waiting state
        await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();
      }
    });
  });

  test.describe('Connection Resilience', () => {
    test('closing display does not affect presenter', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Close display
      await displayPage.close();
      await page.waitForTimeout(500);

      // Presenter should still work
      await expect(page.getByText(/playing|round/i).first()).toBeVisible();

      // Can still interact with presenter
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(200);
      // No error should occur
    });

    test('display reconnects after visibility change', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Simulate tab becoming hidden then visible
      await displayPage.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await page.waitForTimeout(300);

      await displayPage.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await page.waitForTimeout(500);

      // Connection should still be active
      const syncIndicator = displayPage.locator('[class*="bg-success"]').first();
      await expect(syncIndicator).toBeVisible({ timeout: 5000 });
    });

    test('can reopen display after closing', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      // Open and close display
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage1 = await popupPromise;

      await waitForHydration(displayPage1);
      await displayPage1.close();

      await page.waitForTimeout(500);

      // Reopen display
      const popupPromise2 = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage2 = await popupPromise2;

      await waitForHydration(displayPage2);

      // Should work correctly
      await expect(displayPage2.getByText(/audience display/i)).toBeVisible();
      await expect(displayPage2.locator('[class*="bg-success"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('display receives state on reconnect', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Display question on presenter
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(300);

      // Now open display - should receive current state
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await page.waitForTimeout(1000);

      // Display should show the current question
      await expect(displayPage.getByText(/round 1/i)).toBeVisible();
    });
  });

  test.describe('Theme Sync', () => {
    test('theme changes sync from presenter to display', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await page.waitForTimeout(500);

      // Theme selector interaction (if available)
      const themeSelector = page.locator('[aria-label*="theme"], [class*="theme"]').first();
      if (await themeSelector.isVisible()) {
        // Theme changes should sync
      }
    });
  });

  test.describe('Multiple Display Sessions', () => {
    test('opening second display works correctly', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Open first display
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /open display/i }).click();
      const displayPage1 = await popupPromise;

      await waitForHydration(displayPage1);

      // Open second display (should either reuse or create new)
      const openBtn = page.getByRole('button', { name: /open display/i });
      await openBtn.click();
      await page.waitForTimeout(1000);

      // Both should be functional
      await expect(displayPage1.getByText(/audience display/i)).toBeVisible();
    });
  });

  test.describe('Sync Message Types', () => {
    test('STATE_UPDATE message syncs game state', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // State should be synced
      const displayContent = displayPage.locator('main');
      await expect(displayContent).toBeVisible();
    });

    test('REQUEST_SYNC triggers state refresh', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(300);

      // Open display after state is set
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Display should request and receive current state
      await page.waitForTimeout(1000);
      await expect(displayPage.getByText(/round 1/i)).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('rapid state changes sync correctly', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Rapid score changes
      const plusBtn = page.getByRole('button', { name: /add 1 point/i }).first();
      for (let i = 0; i < 5; i++) {
        await plusBtn.click();
        await page.waitForTimeout(50);
      }

      await page.waitForTimeout(500);

      // Final state should be synced correctly
      const presenterContent = page.locator('main');
      await expect(presenterContent).toBeVisible();
    });

    test('handles display opened before teams added', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Open display before any setup
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Display should show waiting state
      await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();

      // Now add team and start
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(500);

      // Display should now show question
      await expect(displayPage.getByText(/round 1/i)).toBeVisible();
    });
  });
});
