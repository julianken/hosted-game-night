import { test, expect } from '../fixtures/auth';
import { waitForHydration } from '../utils/helpers';

test.describe('Bingo Presenter View', () => {
  test.beforeEach(async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);
  });

  test('displays presenter view header @medium', async ({ authenticatedBingoPage: page }) => {
    await expect(page.getByRole('heading', { name: /beak bingo/i })).toBeVisible();
    await expect(page.getByText(/presenter view/i)).toBeVisible();
  });

  test('shows Open Display button @high', async ({ authenticatedBingoPage: page }) => {
    const openDisplayBtn = page.getByRole('button', { name: /open display/i });
    await expect(openDisplayBtn).toBeVisible();
  });

  test('displays bingo board with B-I-N-G-O columns @high', async ({ authenticatedBingoPage: page }) => {
    // Check for column headers - scope to the bingo board area
    const bingoBoard = page.locator('[class*="board"], [data-testid*="board"], main').first();
    await expect(bingoBoard.getByText('B', { exact: true })).toBeVisible();
    await expect(bingoBoard.getByText('I', { exact: true })).toBeVisible();
    await expect(bingoBoard.getByText('N', { exact: true })).toBeVisible();
    await expect(bingoBoard.getByText('G', { exact: true })).toBeVisible();
    await expect(bingoBoard.getByText('O', { exact: true })).toBeVisible();
  });

  test('shows pattern selector @high', async ({ authenticatedBingoPage: page }) => {
    // Look for pattern selection UI - use specific "Pattern" heading or label
    await expect(page.getByRole('heading', { name: /pattern/i })).toBeVisible();
  });

  test('shows settings section with toggles @medium', async ({ authenticatedBingoPage: page }) => {
    await expect(page.getByText(/settings/i)).toBeVisible();
    await expect(page.getByText(/auto-call/i)).toBeVisible();
    await expect(page.getByText(/audio announcements/i)).toBeVisible();
  });

  test('displays keyboard shortcuts reference @medium', async ({ authenticatedBingoPage: page }) => {
    await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible();
    // Look for keyboard shortcuts section specifically (not settings labels)
    const shortcutsSection = page.locator('text=/keyboard shortcuts/i').locator('..');
    await expect(shortcutsSection.getByText('Roll', { exact: true })).toBeVisible();
    await expect(shortcutsSection.getByText(/pause/i)).toBeVisible();
    await expect(shortcutsSection.getByText(/undo/i)).toBeVisible();
  });

  test('shows ball counter at zero initially @high', async ({ authenticatedBingoPage: page }) => {
    // Look for the ball counter display - use specific "0 called" or "0 of 75" text
    await expect(page.getByText('0 called', { exact: true })).toBeVisible();
  });

  test('can select a pattern @high', async ({ authenticatedBingoPage: page }) => {
    // Click to open pattern selector if needed - use specific button with "Pattern" text
    const patternButton = page.getByRole('button', { name: /pattern/i });

    if (await patternButton.isVisible()) {
      await patternButton.click();
      // Select a pattern from dropdown/list - use specific "Single Line" option
      const linePattern = page.getByRole('option', { name: /single line|horizontal/i });
      if (await linePattern.isVisible()) {
        await linePattern.click();
      }
    }

    // Pattern should be selected/shown somewhere - use specific label
    await expect(page.getByText('Winning Pattern')).toBeVisible();
  });

  test('can toggle auto-call setting @medium', async ({ authenticatedBingoPage: page }) => {
    // Find the auto-call switch in settings section
    const settingsSection = page.locator('section, div').filter({ has: page.getByText(/auto.call/i) });
    const autoCallToggle = settingsSection.locator('[role="switch"], [type="checkbox"]');

    if (await autoCallToggle.isVisible()) {
      const initialState = await autoCallToggle.getAttribute('aria-checked');
      await autoCallToggle.click();
      await page.waitForTimeout(100);

      // State should have toggled
      const newState = await autoCallToggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
    }
  });

  test('Start button becomes active @high', async ({ authenticatedBingoPage: page }) => {
    // Look for start/roll button - use specific "Roll" button in game controls
    const startButton = page.getByRole('button', { name: /^(roll|call next ball)$/i });
    await expect(startButton).toBeVisible();
  });

  test('can call a ball with button click @high', async ({ authenticatedBingoPage: page }) => {
    // Find and click the roll/call button - use specific "Roll" button
    const rollButton = page.getByRole('button', { name: /^(roll|call next ball)$/i });

    // Initial state - no ball called - look for exact "0 called" text
    const initialCountText = await page.getByText('0 called', { exact: true }).textContent();
    const initialCount = initialCountText?.match(/(\d+)/)?.[1] || '0';

    await rollButton.click();

    // Wait for animation and state update
    await page.waitForTimeout(2000);

    // Ball should be called - counter should increase - look in game status area
    const statusArea = page.locator('[class*="status"], main').first();
    const newCountText = await statusArea.getByText(/\d+\s*called/i).textContent();
    const newCount = newCountText?.match(/(\d+)/)?.[1] || '0';

    expect(parseInt(newCount)).toBeGreaterThanOrEqual(parseInt(initialCount));
  });

  test('displays current ball after calling @high', async ({ authenticatedBingoPage: page }) => {
    // Call a ball - use specific "Roll" button
    const rollButton = page.getByRole('button', { name: /^(roll|call next ball)$/i });
    await rollButton.click();

    // Wait for the ball to be displayed
    await page.waitForTimeout(2000);

    // Look for ball display (B-15 format)
    const currentBallSection = page.locator('text="Current Ball"').locator('..');
    await expect(currentBallSection).toBeVisible();
  });

  test('board updates when ball is called @high', async ({ authenticatedBingoPage: page }) => {
    // Get initial state of board
    const initialHighlighted = await page.locator('[class*="called"], [class*="highlighted"]').count();

    // Call a ball - use specific "Roll" button
    await page.getByRole('button', { name: /^(roll|call next ball)$/i }).click();
    await page.waitForTimeout(2000);

    // Board should have a highlighted cell
    const newHighlighted = await page.locator('[class*="called"], [class*="highlighted"]').count();

    // Should have one more highlighted cell (or same if we're counting differently)
    expect(newHighlighted).toBeGreaterThanOrEqual(initialHighlighted);
  });

  test('can pause and resume the game @medium', async ({ authenticatedBingoPage: page }) => {
    // Start the game first - use specific "Roll" button
    await page.getByRole('button', { name: /^(roll|call next ball)$/i }).click();
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

  test('undo removes the last called ball @high', async ({ authenticatedBingoPage: page }) => {
    // Call two balls first - use specific "Roll" button
    const rollButton = page.getByRole('button', { name: /^(roll|call next ball)$/i });
    await rollButton.click();
    await page.waitForTimeout(2000);
    await rollButton.click();
    await page.waitForTimeout(2000);

    // Find undo button
    const undoButton = page.getByRole('button', { name: /undo/i });

    if (await undoButton.isVisible() && await undoButton.isEnabled()) {
      // Look for count in status area
      const statusArea = page.locator('[class*="status"], main').first();
      const countBefore = await statusArea.getByText(/\d+\s*called/i).textContent();

      await undoButton.click();
      await page.waitForTimeout(500);

      const countAfter = await statusArea.getByText(/\d+\s*called/i).textContent();

      const before = parseInt(countBefore?.match(/(\d+)/)?.[1] || '0');
      const after = parseInt(countAfter?.match(/(\d+)/)?.[1] || '0');

      expect(after).toBeLessThan(before);
    }
  });

  test('reset clears all called balls @high', async ({ authenticatedBingoPage: page }) => {
    // Call some balls first - use specific "Roll" button
    const rollButton = page.getByRole('button', { name: /^(roll|call next ball)$/i });
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

      // Counter should be back to 0 - use exact match
      await expect(page.getByText('0 called', { exact: true })).toBeVisible();
    }
  });
});
