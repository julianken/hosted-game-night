import { test, expect } from '../fixtures/auth';
import {
  dismissAudioUnlockOverlay,
  waitForHydration,
  waitForDualScreenSync,
  waitForDisplayBallCount,
} from '../utils/helpers';

test.describe('Bingo Dual-Screen Synchronization', () => {
  test.beforeEach(async ({ authenticatedBingoPage: page }) => {
    // Clear any lingering BroadcastChannel state to prevent leakage between tests
    await page.evaluate(() => {
      try {
        const bc = new BroadcastChannel('bingo-sync');
        bc.close();
      } catch (e) {
        // BroadcastChannel may not exist yet, ignore
      }
    });
  });

  test('presenter and display sync on connection', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    // Presenter exposes a sync indicator via data-testid. Before a display is
    // open it shows a neutral dot (not bg-success).
    const syncIndicator = page.getByTestId('sync-indicator');
    await expect(syncIndicator).toBeVisible();

    // Open display from presenter
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    // Once sync is established, the presenter's indicator contains a
    // bg-success dot and the visible label text switches to "Synced".
    await expect(
      syncIndicator.locator('[class*="bg-success"]')
    ).toBeVisible({ timeout: 10000 });
    await expect(syncIndicator.getByText(/synced/i)).toBeVisible({ timeout: 10000 });
  });

  test('ball called on presenter appears on display', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    // Open display
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    // Wait for sync to establish
    await waitForDualScreenSync(displayPage);

    // First click starts the game; subsequent clicks call balls. Wait for
    // the button to re-enable between clicks.
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await expect(rollButton).toBeEnabled({ timeout: 10000 });
    await rollButton.click();

    // Display should show the called-numbers board (behavior-based selector).
    await expect(displayPage.getByTestId('called-numbers-board')).toBeVisible({ timeout: 10000 });

    // Both sides should show at least one ball called.
    await waitForDisplayBallCount(displayPage, 1);
    await expect(async () => {
      const presenterCount = await page.getByTestId('balls-called-count').textContent();
      expect(parseInt(presenterCount || '0')).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10000 });
  });

  test('multiple balls sync correctly', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    // Modal already dismissed by authenticatedBingoPage fixture
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);
    await waitForDualScreenSync(displayPage);

    // Start game and call 3 balls
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();

    // First click starts the game
    await rollButton.click();

    // Wait for button to be enabled (roll sound and audio complete)
    await expect(rollButton).toBeEnabled({ timeout: 10000 });

    // Call first ball
    await rollButton.click();
    await expect(async () => {
      const countText = await page.getByTestId('balls-called-count').textContent();
      const num = parseInt(countText || '0');
      expect(num).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10000 });

    // Wait for display game content to appear (proves BroadcastChannel sync completed)
    await expect(displayPage.locator('[data-testid="balls-called"]')).toBeVisible({ timeout: 10000 });

    // Now safe to check ball counts on display
    await expect(async () => {
      const displayCountText = await displayPage.getByTestId('balls-called-count').textContent();
      const displayNum = parseInt(displayCountText || '0');
      expect(displayNum).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10000 });

    // Wait for button to be enabled (roll sound complete)
    await expect(rollButton).toBeEnabled({ timeout: 10000 });

    // Call second ball
    await rollButton.click();
    await expect(async () => {
      const countText = await page.getByTestId('balls-called-count').textContent();
      const num = parseInt(countText || '0');
      expect(num).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });

    // Wait for display game content to be visible before checking counts
    await expect(displayPage.locator('[data-testid="balls-called"]')).toBeVisible({ timeout: 10000 });

    await expect(async () => {
      const displayCountText = await displayPage.getByTestId('balls-called-count').textContent();
      const displayNum = parseInt(displayCountText || '0');
      expect(displayNum).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });

    // Wait for button to be enabled (roll sound complete)
    await expect(rollButton).toBeEnabled({ timeout: 10000 });

    // Call third ball
    await rollButton.click();
    await expect(async () => {
      const countText = await page.getByTestId('balls-called-count').textContent();
      const num = parseInt(countText || '0');
      expect(num).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 10000 });

    // Wait for display game content to be visible before checking counts
    await expect(displayPage.locator('[data-testid="balls-called"]')).toBeVisible({ timeout: 10000 });

    await expect(async () => {
      const displayCountText = await displayPage.getByTestId('balls-called-count').textContent();
      const displayNum = parseInt(displayCountText || '0');
      expect(displayNum).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 10000 });

    // Check presenter ball count
    const presenterCountText = await page.getByTestId('balls-called-count').textContent();
    const presenterNum = parseInt(presenterCountText || '0');

    // Both should show 3 balls called
    expect(presenterNum).toBeGreaterThanOrEqual(3);

    // Wait for display game content to be visible before final count check
    await expect(displayPage.locator('[data-testid="balls-called"]')).toBeVisible({ timeout: 10000 });

    // Display should also show 3 balls called
    const displayCountText = await displayPage.getByTestId('balls-called-count').textContent();
    const displayNum = parseInt(displayCountText || '0');
    expect(displayNum).toBeGreaterThanOrEqual(3);

    // Display board should also show the called balls (board-level landmark)
    await expect(displayPage.getByTestId('called-numbers-board')).toBeVisible();
  });

  test('pattern change syncs to display', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    // Modal already dismissed by authenticatedBingoPage fixture
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);
    await waitForDualScreenSync(displayPage);

    // Select a pattern on presenter (if dropdown exists)
    const patternSelector = page.getByRole('combobox').filter({ hasText: /pattern/i }).first();

    if (await patternSelector.isVisible()) {
      // Select option using value or label string
      await patternSelector.selectOption('four-corners');

      // Start the game to trigger pattern sync
      await page.getByRole('button', { name: /roll|call|start/i }).first().click();

      // Wait for sync and the "Winning pattern" region to render on display.
      await waitForDualScreenSync(displayPage);
      const patternRegion = displayPage.getByLabel(/winning pattern/i);
      await expect(patternRegion).toBeVisible({ timeout: 10000 });
    }
  });

  test('game reset syncs to display', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);
    await waitForDualScreenSync(displayPage);

    // Start the game and call two balls.
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await expect(rollButton).toBeEnabled({ timeout: 10000 });
    await rollButton.click();
    await waitForDisplayBallCount(displayPage, 1);
    await expect(rollButton).toBeEnabled({ timeout: 10000 });
    await rollButton.click();
    await waitForDisplayBallCount(displayPage, 2);

    // Click "Reset game (R)" which opens a confirmation modal titled
    // "Reset Game?" whose primary action button is labelled "Reset".
    const resetTriggerButton = page.getByRole('button', { name: /reset game/i });
    await expect(resetTriggerButton).toBeVisible();
    await resetTriggerButton.click();

    // Modal: click the confirm button inside the dialog (scoped to avoid the
    // trigger button below the dialog).
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await confirmDialog.getByRole('button', { name: /^reset$/i }).click();

    // Display should reset to zero balls called.
    await expect(displayPage.getByTestId('balls-called-count')).toHaveText(/^0$/, {
      timeout: 10000,
    });
  });

  test('undo syncs to display', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);
    await waitForDualScreenSync(displayPage);

    // Start the game and call two balls.
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await expect(rollButton).toBeEnabled({ timeout: 10000 });
    await rollButton.click();
    await waitForDisplayBallCount(displayPage, 1);
    await expect(rollButton).toBeEnabled({ timeout: 10000 });
    await rollButton.click();
    await waitForDisplayBallCount(displayPage, 2);

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
    await dismissAudioUnlockOverlay(displayPage);
    await waitForDualScreenSync(displayPage);

    // Start the game and call a ball.
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await expect(rollButton).toBeEnabled({ timeout: 10000 });
    await rollButton.click();
    await waitForDisplayBallCount(displayPage, 1);

    // Simulate tab becoming hidden then visible
    await displayPage.evaluate(() => {
      // Trigger visibility change event
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Connection should still be active after the visibility change.
    await waitForDualScreenSync(displayPage);
  });

  test('closing display does not affect presenter', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    // Modal already dismissed by authenticatedBingoPage fixture
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);
    await waitForDualScreenSync(displayPage);

    // Start game then call a ball
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click(); // Start game

    // Wait for button to be enabled (roll sound complete)
    await expect(rollButton).toBeEnabled({ timeout: 10000 });

    await rollButton.click(); // Call first ball
    await waitForDisplayBallCount(displayPage, 1);

    // Verify first ball was called before proceeding
    await expect(async () => {
      const countText = await page.getByTestId('balls-called-count').textContent();
      const num = parseInt(countText || '0');
      expect(num).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10000 });

    // Close display
    await displayPage.close();

    // After the display closes the presenter no longer receives
    // BALL_REVEAL_READY / BALL_SEQUENCE_COMPLETE acknowledgements, so its
    // sync hook must fall back to REVEAL_TIMEOUT_MS + COMPLETE_TIMEOUT_MS
    // safety timers (each 15s at the time of writing). The button will not
    // re-enable until both fallbacks elapse.
    test.slow();
    await expect(rollButton).toBeEnabled({ timeout: 45000 });

    // Presenter should still work - call a second ball.
    await rollButton.click();
    await expect(async () => {
      const countText = await page.getByTestId('balls-called-count').textContent();
      const num = parseInt(countText || '0');
      expect(num).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 45000 });
  });
});
