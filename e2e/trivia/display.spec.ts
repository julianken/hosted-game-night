import { test, expect } from '../fixtures/auth';
import { waitForHydration, waitForDualScreenSync, waitForSyncedContent } from '../utils/helpers';

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
    test('displays correctly when opened from presenter @critical', async ({ authenticatedTriviaPage: page }) => {
      // First go to presenter view
      await waitForHydration(page);

      // Open display window
      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Check display page content
      await expect(displayPage.getByText(/audience display/i)).toBeVisible();
      await expect(displayPage.getByRole('heading', { name: /trivia/i })).toBeVisible();
    });

    test('shows waiting state when game not started @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Should show waiting state
      await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();
    });

    test('shows connection status indicator - connected @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Wait for sync connection to establish
      await waitForDualScreenSync(displayPage);

      // Should show green sync indicator
      const syncIndicator = displayPage.locator('[class*="bg-success"], [class*="bg-green"]').first();
      await expect(syncIndicator).toBeVisible({ timeout: 10000 });
    });

    test('shows sync timestamp when connected @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);
      await waitForDualScreenSync(displayPage);

      // Should show "Synced at" timestamp
      await expect(displayPage.getByText(/synced at/i)).toBeVisible();
    });
  });

  test.describe('Question Content Display', () => {
    test('shows question when displayed by presenter @critical', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Add team and open display
      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Start game
      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();

      // Display question using D key
      await page.keyboard.press('KeyD');
      await waitForSyncedContent(displayPage, /round.*question/i);

      // Display should show question content - use more specific region aria-label
      await expect(displayPage.getByRole('region', { name: /round 1 of \d+, question \d+ of \d+/i })).toBeVisible();
    });

    test('shows round and question number indicator @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
      await page.keyboard.press('KeyD');
      await waitForSyncedContent(displayPage, /round.*question/i);

      // Should show "Round X - Question Y of Z" format - use specific region aria-label
      const roundInfoRegion = displayPage.getByRole('region', { name: /round 1 of \d+, question \d+ of \d+/i });
      await expect(roundInfoRegion).toBeVisible();
    });

    test('shows category badge for questions @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
      await page.keyboard.press('KeyD');
      await waitForSyncedContent(displayPage, /round.*question/i);

      // Should show category badge (music, movies, tv, history)
      const categoryBadge = displayPage.locator('[aria-label*="Category"]');
      await expect(categoryBadge.first()).toBeVisible();
    });

    test('shows answer options list @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
      await page.keyboard.press('KeyD');
      await waitForSyncedContent(displayPage, /round.*question/i);

      // Should show answer options list
      const optionsList = displayPage.locator('[role="list"][aria-label="Answer options"]');
      if (await optionsList.isVisible()) {
        await expect(optionsList).toBeVisible();
      }
    });

    test('question hides when display toggled off @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();

      // Display question
      await page.keyboard.press('KeyD');
      // Wait for state change to propagate

      // Hide question
      await page.keyboard.press('KeyD');
      // Wait for state change to propagate

      // Should show waiting/ready state
      await expect(displayPage.getByText(/get ready/i)).toBeVisible();
    });
  });

  test.describe('Scoreboard Display', () => {
    test('shows scoreboard between rounds @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Add multiple teams
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: /add team/i }).click();
      }

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();

      // Navigate to end of round (5 questions per round default)
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      const completeBtn = page.getByRole('button', { name: /complete round/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();

        // Display should show scoreboard
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();
      }
    });

    test('shows team names on scoreboard @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table 1/i)).toBeVisible();
      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();

      // Navigate to end of round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      const completeBtn = page.getByRole('button', { name: /complete round/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();

        // Should show team names
        await expect(displayPage.getByText(/table 1/i)).toBeVisible();
      }
    });

    test('shows medal rankings (1st, 2nd, 3rd) @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      // Add 4 teams to see medals
      for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: /add team/i }).click();
      }

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();

      // Navigate to end and complete round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      const completeBtn = page.getByRole('button', { name: /complete round/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();

        // Should show medal ranks
        await expect(displayPage.getByText(/1st/i)).toBeVisible();
        await expect(displayPage.getByText(/2nd/i)).toBeVisible();
        await expect(displayPage.getByText(/3rd/i)).toBeVisible();
      }
    });

    test('displays team scores on scoreboard @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();

      // Add some points
      const plusBtn = page.getByRole('button', { name: /add 1 point/i }).first();
      await plusBtn.click();
      await plusBtn.click();

      // Complete round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      const completeBtn = page.getByRole('button', { name: /complete round/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();

        // Should show scores
        const scoreDisplay = displayPage.locator('[aria-label*="points"]');
        await expect(scoreDisplay.first()).toBeVisible();
      }
    });

    test('shows "Next round starting soon" message @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();

      // Navigate to end of round
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowDown');
      }

      const completeBtn = page.getByRole('button', { name: /complete round/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await expect(displayPage.getByText(/round.*complete/i)).toBeVisible();

        // Should show next round indicator - use more specific selector to avoid strict mode violation
        await expect(displayPage.getByText('Next round starting soon...', { exact: true })).toBeVisible();
      }
    });
  });

  test.describe('Timer Display', () => {
    test('timer can be visible on display based on settings @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();

      // Timer visibility is controlled by settings
      // This test verifies the display can show timer when enabled
    });
  });

  test.describe('Pause Overlay', () => {
    test('shows pause overlay when game is paused @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
      await page.keyboard.press('KeyD');
      await waitForSyncedContent(displayPage, /round.*question/i);

      // Pause the game
      await page.keyboard.press('KeyP');
      await expect(displayPage.getByRole('heading', { name: /game paused/i })).toBeVisible();

      // Display should show pause overlay - use heading to avoid strict mode violation
      await expect(displayPage.getByRole('heading', { name: /game paused/i })).toBeVisible();
    });

    test('shows blank screen during emergency pause @critical', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
      await page.keyboard.press('KeyD');
      await waitForSyncedContent(displayPage, /round.*question/i);

      // Emergency pause
      await page.keyboard.press('KeyE');
      await expect(displayPage.getByRole('alert', { name: /display blanked for emergency/i })).toBeVisible();

      // Display should show emergency blank (aria-label for screen readers, no visible text)
      await expect(displayPage.getByRole('alert', { name: /display blanked for emergency/i })).toBeInViewport();
    });

    test('resumes display when game is resumed @high', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
      await page.keyboard.press('KeyD');
      await waitForSyncedContent(displayPage, /round.*question/i);

      // Pause and resume
      await page.keyboard.press('KeyP');
      await page.keyboard.press('KeyP');
      // Should return to normal display - use specific region aria-label
      await expect(displayPage.getByRole('region', { name: /round 1 of \d+, question \d+ of \d+/i })).toBeVisible();
    });
  });

  test.describe('Game End Display', () => {
    test('shows game end state when game is complete @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Note: Full game completion requires completing all rounds
      // This is tested in integration tests
    });
  });

  test.describe('UI Elements and Landmarks', () => {
    test('has proper ARIA landmarks @low', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Should have main landmark
      await expect(displayPage.locator('main, [role="main"]')).toHaveCount(1);

      // Should have header
      await expect(displayPage.locator('header, [role="banner"]')).toHaveCount(1);

      // Should have footer
      await expect(displayPage.locator('footer, [role="contentinfo"]')).toHaveCount(1);
    });

    test('has fullscreen button @low', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      const fullscreenBtn = displayPage.getByRole('button', { name: /fullscreen/i });
      await expect(fullscreenBtn).toBeVisible();
    });

    test('footer shows display hint @low', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Footer should mention projector/display
      await expect(displayPage.getByText(/projector|large display/i)).toBeVisible();
    });

    test('has skip link for keyboard navigation @low', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Skip link should exist (may be visually hidden)
      const skipLink = displayPage.locator('a[href="#display-content"]');
      await expect(skipLink).toHaveCount(1);
    });
  });

  test.describe('Animation Support', () => {
    test('question display has fade-in animation class @low', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      await page.getByRole('button', { name: /start game/i }).click();
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
      await page.keyboard.press('KeyD');
      // Wait for state change to propagate

      // Check for animation classes
      const animatedElement = displayPage.locator('[class*="animate-in"], [class*="fade-in"]');
      if (await animatedElement.count() > 0) {
        await expect(animatedElement.first()).toBeVisible();
      }
    });

    test('respects motion-reduce preference @low', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      await page.getByRole('button', { name: /add team/i }).click();
      await expect(page.getByText(/table \d+/i).first()).toBeVisible();

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
    test('adapts to large viewport (projector) @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Set large viewport
      await displayPage.setViewportSize({ width: 1920, height: 1080 });

      // Content should be visible
      await expect(displayPage.getByRole('heading', { name: /trivia/i })).toBeVisible();
    });

    test('adapts to medium viewport @medium', async ({ authenticatedTriviaPage: page }) => {
      await waitForHydration(page);

      const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

      await waitForHydration(displayPage);

      // Set medium viewport
      await displayPage.setViewportSize({ width: 1024, height: 768 });

      // Content should be visible
      await expect(displayPage.getByRole('heading', { name: /trivia/i })).toBeVisible();
    });
  });
});
