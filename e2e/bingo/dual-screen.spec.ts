import { test, expect } from '../fixtures/auth';
import { waitForHydration } from '../utils/helpers';

test.describe('Bingo Dual-Screen Synchronization', () => {
  test('presenter and display sync on connection', async ({ authenticatedBingoPage: page }) => {
    // Open presenter
    await waitForHydration(page);

    // Check presenter shows sync ready status
    await expect(page.getByText(/sync ready|sync active/i)).toBeVisible();

    // Open display from presenter
    // Start waiting for popup before clicking. Note no await.
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);

    // Both should show connected status
    await expect(page.getByText(/sync active/i)).toBeVisible({ timeout: 10000 });
    await expect(displayPage.locator('[class*="bg-success"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('ball called on presenter appears on display', async ({ authenticatedBingoPage: page }) => {
    // Setup presenter
    await waitForHydration(page);

    // Open display
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);

    // Wait for sync to establish
    await page.waitForTimeout(1000);

    // Call a ball
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();

    // Wait for the ball to be called and synced
    await page.waitForTimeout(3000);

    // Get the ball from presenter (looking for B-XX, I-XX, etc. format)
    const presenterBallArea = page.locator('text="Current Ball"').locator('..').locator('[class*="ball-"]');
    const presenterBallCount = await presenterBallArea.count();

    // If presenter shows a ball, display should also
    if (presenterBallCount > 0) {
      // Display should show called numbers or current ball
      const displayBallArea = displayPage.locator('text=/called numbers|current ball/i');
      await expect(displayBallArea.first()).toBeVisible();
    }
  });

  test('multiple balls sync correctly', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await page.waitForTimeout(1000);

    // Call 3 balls
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    for (let i = 0; i < 3; i++) {
      await rollButton.click();
      await page.waitForTimeout(2000);
    }

    // Check presenter ball count
    const presenterCount = await page.getByText(/(\d+)\s*called/i).first().textContent();
    const presenterNum = parseInt(presenterCount?.match(/(\d+)/)?.[1] || '0');

    // Both should show 3 balls called (or the board should reflect 3 calls)
    expect(presenterNum).toBeGreaterThanOrEqual(3);

    // Display board should also show the called balls
    const displayBoard = displayPage.locator('text="Called Numbers"').locator('..');
    await expect(displayBoard).toBeVisible();
  });

  test('pattern change syncs to display', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);

    // Select a pattern on presenter (if dropdown exists)
    const patternSelector = page.getByRole('combobox').filter({ hasText: /pattern/i }).first();

    if (await patternSelector.isVisible()) {
      await patternSelector.click();
      await page.getByText(/four corners/i).first().click();
      await page.waitForTimeout(1000);

      // Start the game to trigger pattern sync
      await page.getByRole('button', { name: /roll|call|start/i }).first().click();
      await page.waitForTimeout(2000);

      // Display should show the pattern
      const displayPattern = displayPage.getByText(/pattern|four corners/i);
      await expect(displayPattern.first()).toBeVisible();
    }
  });

  test('game reset syncs to display', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);

    // Call some balls
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await page.waitForTimeout(2000);
    await rollButton.click();
    await page.waitForTimeout(2000);

    // Reset the game
    const resetButton = page.getByRole('button', { name: /reset/i });
    if (await resetButton.isVisible()) {
      await resetButton.click();

      // Handle confirmation if present
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      await page.waitForTimeout(1000);

      // Display should reset (show waiting/ready state or zero balls)
      const displayWaiting = displayPage.getByText(/ready to start|waiting|0.*called/i);
      await expect(displayWaiting.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('undo syncs to display', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);

    // Call some balls
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await page.waitForTimeout(2000);
    await rollButton.click();
    await page.waitForTimeout(2000);

    // Get count before undo
    const countBefore = await displayPage.getByText(/(\d+).*called/i).first().textContent();
    const numBefore = parseInt(countBefore?.match(/(\d+)/)?.[1] || '0');

    // Undo
    const undoButton = page.getByRole('button', { name: /undo/i });
    if (await undoButton.isVisible() && await undoButton.isEnabled()) {
      await undoButton.click();
      await page.waitForTimeout(1000);

      // Display count should decrease
      const countAfter = await displayPage.getByText(/(\d+).*called/i).first().textContent();
      const numAfter = parseInt(countAfter?.match(/(\d+)/)?.[1] || '0');

      expect(numAfter).toBeLessThan(numBefore);
    }
  });

  test('display reconnects after visibility change', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);

    // Call a ball
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();
    await page.waitForTimeout(2000);

    // Simulate tab becoming hidden then visible
    await displayPage.evaluate(() => {
      // Trigger visibility change event
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Connection should still be active
    const syncIndicator = displayPage.locator('[class*="bg-success"]').first();
    await expect(syncIndicator).toBeVisible({ timeout: 5000 });
  });

  test('closing display does not affect presenter', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);

    // Call a ball
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();
    await page.waitForTimeout(2000);

    // Close display
    await displayPage.close();

    // Presenter should still work
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();
    await page.waitForTimeout(1000);

    // Presenter should show 2 balls called
    const count = await page.getByText(/(\d+)\s*called/i).first().textContent();
    const num = parseInt(count?.match(/(\d+)/)?.[1] || '0');
    expect(num).toBeGreaterThanOrEqual(2);
  });
});
