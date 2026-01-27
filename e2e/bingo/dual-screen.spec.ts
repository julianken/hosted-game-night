import { test, expect } from '../fixtures/auth';
import { waitForHydration, waitForDualScreenSync, waitForSyncedContent } from '../utils/helpers';

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
    await waitForDualScreenSync(displayPage);

    // Call a ball
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();

    // Wait for sync to update display with called ball
    await waitForSyncedContent(displayPage, /called numbers|current ball/i);

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

    // Modal already dismissed by authenticatedBingoPage fixture
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await waitForDualScreenSync(displayPage);

    // Call 3 balls
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    for (let i = 0; i < 3; i++) {
      await rollButton.click();
      // Wait for ball count to increment on presenter using data-testid
      const expectedCount = i + 1;
      await expect(async () => {
        const countText = await page.getByTestId('balls-called-count').textContent();
        const num = parseInt(countText || '0');
        expect(num).toBeGreaterThanOrEqual(expectedCount);
      }).toPass({ timeout: 10000 });

      // Wait for sync to complete on display
      await expect(async () => {
        const displayCountText = await displayPage.getByTestId('balls-called-count').textContent();
        const displayNum = parseInt(displayCountText || '0');
        expect(displayNum).toBeGreaterThanOrEqual(expectedCount);
      }).toPass({ timeout: 10000 });
    }

    // Check presenter ball count
    const presenterCountText = await page.getByTestId('balls-called-count').textContent();
    const presenterNum = parseInt(presenterCountText || '0');

    // Both should show 3 balls called
    expect(presenterNum).toBeGreaterThanOrEqual(3);

    // Display should also show 3 balls called
    const displayCountText = await displayPage.getByTestId('balls-called-count').textContent();
    const displayNum = parseInt(displayCountText || '0');
    expect(displayNum).toBeGreaterThanOrEqual(3);

    // Display board should also show the called balls
    const displayBoard = displayPage.locator('text="Called Numbers"').locator('..');
    await expect(displayBoard).toBeVisible();
  });

  test('pattern change syncs to display', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    // Modal already dismissed by authenticatedBingoPage fixture
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await waitForDualScreenSync(displayPage);

    // Select a pattern on presenter (if dropdown exists)
    const patternSelector = page.getByRole('combobox').filter({ hasText: /pattern/i }).first();

    if (await patternSelector.isVisible()) {
      // Select option using value or label string
      await patternSelector.selectOption('four-corners');

      // Start the game to trigger pattern sync
      await page.getByRole('button', { name: /roll|call|start/i }).first().click();

      // Wait for pattern to sync to display
      await waitForSyncedContent(displayPage, /pattern|four corners/i);

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
    await waitForDualScreenSync(displayPage);

    // Call some balls
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await waitForSyncedContent(displayPage, /called numbers|current ball/i);
    await rollButton.click();
    await waitForSyncedContent(displayPage, /called numbers|current ball/i);

    // Reset the game
    const resetButton = page.getByRole('button', { name: /reset/i });
    if (await resetButton.isVisible()) {
      await resetButton.click();

      // Handle confirmation if present
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Display should reset (show waiting/ready state or zero balls)
      await waitForSyncedContent(displayPage, /ready to start|waiting|0.*called/i);
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
    await waitForDualScreenSync(displayPage);

    // Call some balls
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await waitForSyncedContent(displayPage, /called numbers|current ball/i);
    await rollButton.click();
    await waitForSyncedContent(displayPage, /called numbers|current ball/i);

    // Get count before undo using data-testid
    const countBeforeText = await displayPage.getByTestId('balls-called-count').textContent();
    const numBefore = parseInt(countBeforeText || '0');

    // Undo
    const undoButton = page.getByRole('button', { name: /undo/i });
    if (await undoButton.isVisible() && await undoButton.isEnabled()) {
      await undoButton.click();

      // Wait for undo to sync (count should change)
      await expect(async () => {
        const countAfterText = await displayPage.getByTestId('balls-called-count').textContent();
        const numAfter = parseInt(countAfterText || '0');
        expect(numAfter).toBeLessThan(numBefore);
      }).toPass({ timeout: 10000 });
    }
  });

  test('display reconnects after visibility change', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await waitForDualScreenSync(displayPage);

    // Call a ball
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();
    await waitForSyncedContent(displayPage, /called numbers|current ball/i);

    // Simulate tab becoming hidden then visible
    await displayPage.evaluate(() => {
      // Trigger visibility change event
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Connection should still be active
    await waitForDualScreenSync(displayPage);
    const syncIndicator = displayPage.locator('[class*="bg-success"]').first();
    await expect(syncIndicator).toBeVisible({ timeout: 5000 });
  });

  test('closing display does not affect presenter', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    // Modal already dismissed by authenticatedBingoPage fixture
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await waitForDualScreenSync(displayPage);

    // Call a ball
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();
    await waitForSyncedContent(displayPage, /called numbers|current ball/i);

    // Close display
    await displayPage.close();

    // Presenter should still work - wait for ball count to update using data-testid
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();
    await expect(async () => {
      const countText = await page.getByTestId('balls-called-count').textContent();
      const num = parseInt(countText || '0');
      expect(num).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });
  });
});
