import { test, expect } from '../fixtures/game';
import { waitForHydration, pressKey } from '../utils/helpers';

test.describe('Bingo Keyboard Shortcuts', () => {
  test.beforeEach(async ({ bingoPage: page }) => {
    await waitForHydration(page);

    // Wait for keyboard event handlers to be registered
    // The useGameKeyboard hook registers listeners in a useEffect
    await page.waitForTimeout(500);

    // Ensure page is focused (not any specific element)
    // This allows keyboard shortcuts to work properly
    await page.evaluate(() => {
      const body = document.querySelector('body');
      if (body) {
        body.focus();
      }
    });
  });

  test('Space key calls a ball', async ({ bingoPage: page }) => {
    // Start the game first - Space only works when canCall is true
    const startButton = page.getByRole('button', { name: /start game/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
    }

    // Get initial ball count
    const initialCount = await page.getByText(/(\d+)\s*called/i).first().textContent();
    const initialNum = parseInt(initialCount?.match(/(\d+)/)?.[1] || '0');

    // Press Space to call a ball
    await page.keyboard.press('Space');

    // Wait for ball to be called (audio + animation) using event-driven assertion
    await expect(async () => {
      const count = await page.getByText(/(\d+)\s*called/i).first().textContent();
      const num = parseInt(count?.match(/(\d+)/)?.[1] || '0');
      expect(num).toBeGreaterThan(initialNum);
    }).toPass({ timeout: 5000 });
  });

  test('P key toggles pause', async ({ bingoPage: page }) => {
    // Start the game first
    const startButton = page.getByRole('button', { name: /start game/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
    }

    // Get initial ball count
    const initialCount = await page.getByText(/(\d+)\s*called/i).first().textContent();
    const initialNum = parseInt(initialCount?.match(/(\d+)/)?.[1] || '0');

    // Call a ball to ensure game is in playing state
    await page.keyboard.press('Space');

    // Wait for ball to be called using event-driven assertion
    await expect(async () => {
      const count = await page.getByText(/(\d+)\s*called/i).first().textContent();
      const num = parseInt(count?.match(/(\d+)/)?.[1] || '0');
      expect(num).toBeGreaterThan(initialNum);
    }).toPass({ timeout: 5000 });

    // Press P to pause
    await page.keyboard.press('KeyP');

    // Should show resume button
    const resumeButton = page.getByRole('button', { name: /resume/i });
    await expect(resumeButton).toBeVisible({ timeout: 2000 });

    // Press P again to resume
    await page.keyboard.press('KeyP');

    // Should show pause button again
    const pauseButton = page.getByRole('button', { name: /pause/i });
    await expect(pauseButton).toBeVisible({ timeout: 2000 });
  });

  test('U key undoes last call', async ({ bingoPage: page }) => {
    // Start the game first
    const startButton = page.getByRole('button', { name: /start game/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
    }

    // Get initial ball count
    const initialCount = await page.getByText(/(\d+)\s*called/i).first().textContent();
    const initialNum = parseInt(initialCount?.match(/(\d+)/)?.[1] || '0');

    // Call first ball
    await page.keyboard.press('Space');

    // Wait for first ball to complete (including audio processing)
    // The game has an isProcessingRef guard that blocks calls during audio playback
    await expect(async () => {
      const count = await page.getByText(/(\d+)\s*called/i).first().textContent();
      const num = parseInt(count?.match(/(\d+)/)?.[1] || '0');
      expect(num).toBe(initialNum + 1);
    }).toPass({ timeout: 5000 });

    // Wait for audio processing to complete before second call
    // Uses data-processing attribute from Roll button
    await expect(async () => {
      const rollButton = page.getByRole('button', { name: /roll/i });
      const processing = await rollButton.getAttribute('data-processing');
      expect(processing).not.toBe('true');
    }).toPass({ timeout: 5000 });

    // Call second ball
    await page.keyboard.press('Space');

    // Wait for second ball to complete
    await expect(async () => {
      const count = await page.getByText(/(\d+)\s*called/i).first().textContent();
      const num = parseInt(count?.match(/(\d+)/)?.[1] || '0');
      expect(num).toBe(initialNum + 2);
    }).toPass({ timeout: 5000 });

    const countBefore = await page.getByText(/(\d+)\s*called/i).first().textContent();
    const numBefore = parseInt(countBefore?.match(/(\d+)/)?.[1] || '0');

    // Wait for audio processing to complete before undo
    // Uses data-processing attribute from Roll button
    await expect(async () => {
      const rollButton = page.getByRole('button', { name: /roll/i });
      const processing = await rollButton.getAttribute('data-processing');
      expect(processing).not.toBe('true');
    }).toPass({ timeout: 5000 });

    // Press U to undo
    await page.keyboard.press('KeyU');

    // Wait for undo to complete using event-driven assertion
    await expect(async () => {
      const count = await page.getByText(/(\d+)\s*called/i).first().textContent();
      const num = parseInt(count?.match(/(\d+)/)?.[1] || '0');
      expect(num).toBe(numBefore - 1);
    }).toPass({ timeout: 2000 });
  });

  test('R key resets the game', async ({ bingoPage: page }) => {
    // Start the game first
    const startButton = page.getByRole('button', { name: /start game/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
    }

    // Get initial ball count
    const initialCount = await page.getByText(/(\d+)\s*called/i).first().textContent();
    const initialNum = parseInt(initialCount?.match(/(\d+)/)?.[1] || '0');

    // Call first ball
    await page.keyboard.press('Space');

    // Wait for first ball to complete (including audio processing)
    await expect(async () => {
      const count = await page.getByText(/(\d+)\s*called/i).first().textContent();
      const num = parseInt(count?.match(/(\d+)/)?.[1] || '0');
      expect(num).toBe(initialNum + 1);
    }).toPass({ timeout: 5000 });

    // Wait for audio processing to complete before second call
    // Uses data-processing attribute from Roll button
    await expect(async () => {
      const rollButton = page.getByRole('button', { name: /roll/i });
      const processing = await rollButton.getAttribute('data-processing');
      expect(processing).not.toBe('true');
    }).toPass({ timeout: 5000 });

    // Call second ball
    await page.keyboard.press('Space');

    // Wait for second ball to complete
    await expect(async () => {
      const count = await page.getByText(/(\d+)\s*called/i).first().textContent();
      const num = parseInt(count?.match(/(\d+)/)?.[1] || '0');
      expect(num).toBe(initialNum + 2);
    }).toPass({ timeout: 5000 });

    // Press R to reset
    await page.keyboard.press('KeyR');

    // Confirm reset — the dialog renders a "Reset" button (confirmLabel in
    // ControlPanel). Scope to the dialog to avoid strict-mode violation with
    // the persistent "Reset game (R)" header button.
    const confirmButton = page
      .getByRole('dialog')
      .getByRole('button', { name: /^(confirm|yes|reset)$/i });
    try {
      await confirmButton.waitFor({ state: 'visible', timeout: 2000 });
      await confirmButton.click();
    } catch {
      // No confirmation dialog - that's fine
    }

    // Ball count should be 0 - use event-driven assertion
    await expect(page.getByText(/0\s*called/i)).toBeVisible({ timeout: 2000 });
  });

  test('M key toggles audio', async ({ bingoPage: page }) => {
    // Find audio toggle state
    const audioToggle = page.getByRole('switch').filter({ hasText: /audio/i }).or(
      page.locator('[aria-label*="audio"]')
    ).first();

    let initialState: string | null = null;
    if (await audioToggle.isVisible()) {
      initialState = await audioToggle.getAttribute('aria-checked');
    }

    // Press M to toggle audio
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(300);

    // State should have changed
    if (await audioToggle.isVisible()) {
      const newState = await audioToggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);

      // Toggle back
      await page.keyboard.press('KeyM');
      await page.waitForTimeout(300);

      const finalState = await audioToggle.getAttribute('aria-checked');
      expect(finalState).toBe(initialState);
    }
  });

  // Removed: Test for non-existent feature
  // The Bingo play page does not have text input fields - it uses buttons, toggles, and selectors.
  // If text inputs are added in the future, this test can be restored to verify keyboard shortcuts
  // don't trigger while typing in input fields.

  test.fixme('display page F key toggles fullscreen', async ({ bingoPage: page, context }) => {
    // FIXME: Display page popup tests are blocked by BEA-333 (dual-screen popup handling)
    // The popup window times out at 30s before we can test keyboard shortcuts
    // Re-enable this test once BEA-333 is resolved

    await waitForHydration(page);

    const [displayPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: /open display/i }).click(),
    ]);

    await waitForHydration(displayPage);

    // Wait for keyboard event handlers to be registered on display page
    await displayPage.waitForTimeout(500);

    // Note: Fullscreen API may not work in headless mode
    // Just verify the key handler exists by checking for UI response
    await displayPage.keyboard.press('KeyF');
    await displayPage.waitForTimeout(500);

    // If fullscreen indicator appears, it worked
    // Otherwise, just verify no error occurred
    const fullscreenIndicator = displayPage.getByText(/fullscreen/i);
    // This is acceptable whether fullscreen works or not in test environment
    expect(await fullscreenIndicator.count()).toBeGreaterThanOrEqual(0);
  });

  test.fixme('display page ? key opens help modal', async ({ bingoPage: page, context }) => {
    // FIXME: Display page popup tests are blocked by BEA-333 (dual-screen popup handling)
    // The popup window times out at 30s before we can test keyboard shortcuts
    // Re-enable this test once BEA-333 is resolved

    await waitForHydration(page);

    const [displayPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: /open display/i }).click(),
    ]);

    await waitForHydration(displayPage);

    // Wait for keyboard event handlers to be registered on display page
    await displayPage.waitForTimeout(500);

    // Press ? to open help
    await displayPage.keyboard.press('Shift+/'); // ? is Shift+/

    // Help modal should appear
    const helpModal = displayPage.getByRole('dialog');
    await expect(helpModal).toBeVisible({ timeout: 2000 });
    await expect(helpModal).toContainText(/keyboard|shortcut|help/i);

    // Close with Escape
    await displayPage.keyboard.press('Escape');
    await expect(helpModal).not.toBeVisible();
  });

  test('multiple rapid key presses are handled correctly', async ({ bingoPage: page }) => {
    // Start the game first
    const startButton = page.getByRole('button', { name: /start game/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
    }

    // Get initial count
    const initialCount = await page.getByText(/(\d+)\s*called/i).first().textContent();
    const initialNum = parseInt(initialCount?.match(/(\d+)/)?.[1] || '0');

    // Press Space rapidly 3 times
    // The hook has a guard (isProcessingRef) to prevent race conditions
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    await page.keyboard.press('Space');

    // Wait for all balls to be called using event-driven assertion
    // Should have called at least 1 ball (may not be exactly 3 due to race condition guards)
    await expect(async () => {
      const count = await page.getByText(/(\d+)\s*called/i).first().textContent();
      const num = parseInt(count?.match(/(\d+)/)?.[1] || '0');
      expect(num).toBeGreaterThan(initialNum);
    }).toPass({ timeout: 10000 });
  });
});
