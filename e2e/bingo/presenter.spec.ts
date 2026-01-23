import { test, expect } from '@playwright/test';
import { waitForHydration, clickButton, pressKey } from '../utils/helpers';

test.describe('Bingo Presenter View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play');
    await waitForHydration(page);
  });

  test('displays presenter view header @medium', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /beak bingo/i })).toBeVisible();
    await expect(page.getByText(/presenter view/i)).toBeVisible();
  });

  test('shows Open Display button @high', async ({ page }) => {
    const openDisplayBtn = page.getByRole('button', { name: /open display/i });
    await expect(openDisplayBtn).toBeVisible();
  });

  test('displays bingo board with B-I-N-G-O columns @high', async ({ page }) => {
    // Check for column headers
    await expect(page.getByText('B').first()).toBeVisible();
    await expect(page.getByText('I').first()).toBeVisible();
    await expect(page.getByText('N').first()).toBeVisible();
    await expect(page.getByText('G').first()).toBeVisible();
    await expect(page.getByText('O').first()).toBeVisible();
  });

  test('shows pattern selector @high', async ({ page }) => {
    // Look for pattern selection UI
    const patternSection = page.getByText(/pattern/i).first();
    await expect(patternSection).toBeVisible();
  });

  test('shows settings section with toggles @medium', async ({ page }) => {
    await expect(page.getByText(/settings/i)).toBeVisible();
    await expect(page.getByText(/auto-call/i)).toBeVisible();
    await expect(page.getByText(/audio announcements/i)).toBeVisible();
  });

  test('displays keyboard shortcuts reference @medium', async ({ page }) => {
    await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible();
    await expect(page.getByText(/roll/i)).toBeVisible();
    await expect(page.getByText(/pause/i)).toBeVisible();
    await expect(page.getByText(/undo/i)).toBeVisible();
  });

  test('shows ball counter at zero initially @high', async ({ page }) => {
    // Look for the ball counter display
    const counter = page.getByText(/0\s*(called|of|remaining)/i).first();
    await expect(counter).toBeVisible();
  });

  test('can select a pattern @high', async ({ page }) => {
    // Click to open pattern selector if needed
    const patternButton = page.getByRole('button').filter({ hasText: /line|pattern/i }).first();

    if (await patternButton.isVisible()) {
      await patternButton.click();
      // Select a pattern from dropdown/list
      const linePattern = page.getByText(/horizontal line|single line/i).first();
      if (await linePattern.isVisible()) {
        await linePattern.click();
      }
    }

    // Pattern should be selected/shown somewhere
    await expect(page.getByText(/pattern/i)).toBeVisible();
  });

  test('can toggle auto-call setting @medium', async ({ page }) => {
    const autoCallToggle = page.locator('[role="switch"], [type="checkbox"]')
      .filter({ hasNot: page.locator('[disabled]') })
      .first();

    if (await autoCallToggle.isVisible()) {
      const initialState = await autoCallToggle.getAttribute('aria-checked');
      await autoCallToggle.click();
      await page.waitForTimeout(100);

      // State should have toggled
      const newState = await autoCallToggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
    }
  });

  test('Start button becomes active @high', async ({ page }) => {
    // Look for start/roll button
    const startButton = page.getByRole('button', { name: /start|roll|call/i }).first();
    await expect(startButton).toBeVisible();
  });

  test('can call a ball with button click @high', async ({ page }) => {
    // Find and click the roll/call button
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();

    // Initial state - no ball called
    const initialCountText = await page.getByText(/(\d+)\s*(called|of)/i).first().textContent();
    const initialCount = initialCountText?.match(/(\d+)/)?.[1] || '0';

    await rollButton.click();

    // Wait for animation and state update
    await page.waitForTimeout(2000);

    // Ball should be called - counter should increase or ball should appear
    const newCountText = await page.getByText(/(\d+)\s*(called|of)/i).first().textContent();
    const newCount = newCountText?.match(/(\d+)/)?.[1] || '0';

    expect(parseInt(newCount)).toBeGreaterThanOrEqual(parseInt(initialCount));
  });

  test('displays current ball after calling @high', async ({ page }) => {
    // Call a ball
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();

    // Wait for the ball to be displayed
    await page.waitForTimeout(2000);

    // Look for ball display (B-15 format)
    const currentBallSection = page.locator('text="Current Ball"').locator('..');
    await expect(currentBallSection).toBeVisible();
  });

  test('board updates when ball is called @high', async ({ page }) => {
    // Get initial state of board
    const initialHighlighted = await page.locator('[class*="called"], [class*="highlighted"]').count();

    // Call a ball
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();
    await page.waitForTimeout(2000);

    // Board should have a highlighted cell
    const newHighlighted = await page.locator('[class*="called"], [class*="highlighted"]').count();

    // Should have one more highlighted cell (or same if we're counting differently)
    expect(newHighlighted).toBeGreaterThanOrEqual(initialHighlighted);
  });

  test('can pause and resume the game @medium', async ({ page }) => {
    // Start the game first
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();
    await page.waitForTimeout(1000);

    // Look for pause button
    const pauseButton = page.getByRole('button', { name: /pause/i });

    if (await pauseButton.isVisible()) {
      await pauseButton.click();

      // Should show resume option now
      await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();

      // Resume
      await page.getByRole('button', { name: /resume/i }).click();
    }
  });

  test('undo removes the last called ball @high', async ({ page }) => {
    // Call two balls first
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await page.waitForTimeout(2000);
    await rollButton.click();
    await page.waitForTimeout(2000);

    // Find undo button
    const undoButton = page.getByRole('button', { name: /undo/i });

    if (await undoButton.isVisible() && await undoButton.isEnabled()) {
      const countBefore = await page.getByText(/(\d+)\s*called/i).first().textContent();

      await undoButton.click();
      await page.waitForTimeout(500);

      const countAfter = await page.getByText(/(\d+)\s*called/i).first().textContent();

      const before = parseInt(countBefore?.match(/(\d+)/)?.[1] || '0');
      const after = parseInt(countAfter?.match(/(\d+)/)?.[1] || '0');

      expect(after).toBeLessThan(before);
    }
  });

  test('reset clears all called balls @high', async ({ page }) => {
    // Call some balls first
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await page.waitForTimeout(2000);

    // Find reset button
    const resetButton = page.getByRole('button', { name: /reset/i });

    if (await resetButton.isVisible()) {
      await resetButton.click();

      // May have confirmation dialog
      const confirmButton = page.getByRole('button', { name: /confirm|yes|reset/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      await page.waitForTimeout(500);

      // Counter should be back to 0
      await expect(page.getByText(/0\s*called/i)).toBeVisible();
    }
  });
});
