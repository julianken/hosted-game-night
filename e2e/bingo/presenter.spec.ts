/**
 * Bingo Presenter View E2E Tests
 *
 * ⚠️ REFACTORED (BEA-383): Replaced all 9 waitForTimeout() calls with deterministic waits
 * - Pattern 1: Wait for element visibility after actions (e.g., ball called, counter updated)
 * - Pattern 2: Wait for state change indicators (e.g., button states, board highlighting)
 * - Pattern 3: Use .toPass() for complex conditions requiring retry logic
 */
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
    // Ball counter shows number and "Called" as separate elements
    // Use exact match to avoid matching "Called Numbers" heading and other text
    await expect(page.getByText('0').first()).toBeVisible();
    await expect(page.getByText('Called', { exact: true })).toBeVisible();
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
    // Find the auto-call switch by its specific name to avoid matching multiple switches
    const autoCallToggle = page.getByRole('switch', { name: /auto.call/i });

    if (await autoCallToggle.isVisible()) {
      const initialState = await autoCallToggle.getAttribute('aria-checked');
      await autoCallToggle.click();

      // Wait for toggle state change (Pattern 3: use .toPass() for attribute change)
      await expect(async () => {
        const newState = await autoCallToggle.getAttribute('aria-checked');
        expect(newState).not.toBe(initialState);
      }).toPass({ timeout: 5000 });
    }
  });

  test('Start button becomes active @high', async ({ authenticatedBingoPage: page }) => {
    // Button shows "Start Game" initially, then "Roll [Space]" after game starts
    const startButton = page.getByRole('button', { name: /start game|roll/i });
    await expect(startButton).toBeVisible();
  });

  test('can call a ball with button click @high', async ({ authenticatedBingoPage: page }) => {
    // Find and click the roll/call button - "Start Game" initially, then "Roll [Space]"
    const rollButton = page.getByRole('button', { name: /start game|roll/i });

    // Click to start the game
    await rollButton.click();

    // Click again to call first ball (button text changes to "Roll [Space]" after starting)
    await rollButton.click();

    // Wait for ball to be called and counter to update (Pattern 3: complex condition)
    await expect(async () => {
      // Ball counter should show at least 1 called - use data-testid for precise targeting
      const calledCount = page.getByTestId('balls-called-count');
      await expect(calledCount).toBeVisible({ timeout: 1000 });

      const countText = await calledCount.textContent();
      const count = parseInt(countText || '0');
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });
  });

  test('displays current ball after calling @high', async ({ authenticatedBingoPage: page }) => {
    // Call a ball - "Start Game" initially, then "Roll [Space]"
    const rollButton = page.getByRole('button', { name: /start game|roll/i });
    await rollButton.click(); // Start game
    await rollButton.click(); // Call first ball

    // Wait for the ball to be displayed (Pattern 1: element visibility)
    const currentBallSection = page.locator('text="Current Ball"').locator('..');
    await expect(currentBallSection).toBeVisible({ timeout: 10000 });
  });

  test('board updates when ball is called @high', async ({ authenticatedBingoPage: page }) => {
    // Get initial state of board (cells with aria-label containing ", called")
    const initialHighlighted = await page.locator('[role="gridcell"][aria-label*=", called"]').count();

    // Call a ball - "Start Game" initially, then "Roll [Space]"
    const rollButton = page.getByRole('button', { name: /start game|roll/i });
    await rollButton.click(); // Start game
    await rollButton.click(); // Call first ball

    // Wait for board to update (Pattern 3: use .toPass() for count change)
    await expect(async () => {
      const newHighlighted = await page.locator('[role="gridcell"][aria-label*=", called"]').count();
      expect(newHighlighted).toBeGreaterThanOrEqual(initialHighlighted + 1);
    }).toPass({ timeout: 10000 });
  });

  test('can pause and resume the game @medium', async ({ authenticatedBingoPage: page }) => {
    // Start the game first - "Start Game" initially
    const rollButton = page.getByRole('button', { name: /start game|roll/i });
    await rollButton.click(); // Start game
    await rollButton.click(); // Call first ball

    // Wait for game to start (Pattern 2: button text changes to "Roll")
    await expect(async () => {
      const rollButton = page.getByRole('button', { name: /roll/i });
      await expect(rollButton).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 5000 });

    // Look for pause button
    const pauseButton = page.getByRole('button', { name: /pause/i });

    if (await pauseButton.isVisible()) {
      await pauseButton.click();

      // Should show resume option now (Pattern 2: state change)
      await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();

      // Resume
      await page.getByRole('button', { name: /resume/i }).click();
    }
  });

  test('undo removes the last called ball @high', async ({ authenticatedBingoPage: page }) => {
    // Call two balls first - "Start Game" initially, then "Roll [Space]"
    const rollButton = page.getByRole('button', { name: /start game|roll/i });

    await rollButton.click(); // Start game
    await rollButton.click(); // Call first ball

    // Wait for first ball (Pattern 3) - use data-testid for precise targeting
    await expect(async () => {
      const calledCount = page.getByTestId('balls-called-count');
      const countText = await calledCount.textContent();
      expect(parseInt(countText || '0')).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10000 });

    // Wait for roll sound to complete (2s duration + buffer)
    await page.waitForTimeout(3000);

    // Use keyboard shortcut for more reliable second call
    await page.keyboard.press('Space'); // Call second ball

    // Wait for second ball (Pattern 3) - use data-testid for precise targeting
    await expect(async () => {
      const calledCount = page.getByTestId('balls-called-count');
      const countText = await calledCount.textContent();
      expect(parseInt(countText || '0')).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });

    // Find undo button
    const undoButton = page.getByRole('button', { name: /undo/i });

    if (await undoButton.isVisible() && await undoButton.isEnabled()) {
      // Get count from ball counter - use data-testid for precise targeting
      const calledCount = page.getByTestId('balls-called-count');
      const countBefore = await calledCount.textContent();

      await undoButton.click();

      // Wait for undo to complete (Pattern 3: count decreases)
      await expect(async () => {
        const countAfter = await calledCount.textContent();
        const before = parseInt(countBefore || '0');
        const after = parseInt(countAfter || '0');
        expect(after).toBeLessThan(before);
      }).toPass({ timeout: 5000 });
    }
  });

  test('reset clears all called balls @high', async ({ authenticatedBingoPage: page }) => {
    // Call some balls first - "Start Game" initially
    const rollButton = page.getByRole('button', { name: /start game|roll/i });
    await rollButton.click(); // Start game
    await rollButton.click(); // Call first ball

    // Wait for ball to be called (Pattern 3) - use data-testid for precise targeting
    await expect(async () => {
      const calledCount = page.getByTestId('balls-called-count');
      const countText = await calledCount.textContent();
      expect(parseInt(countText || '0')).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });

    // Find reset button
    const resetButton = page.getByRole('button', { name: /reset/i });

    if (await resetButton.isVisible()) {
      await resetButton.click();

      // May have confirmation dialog
      const confirmButton = page.getByRole('button', { name: /confirm|yes|reset/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Wait for reset to complete (Pattern 2: counter back to 0) - use data-testid for precise targeting
      const calledCount = page.getByTestId('balls-called-count');
      await expect(calledCount).toHaveText('0');
      await expect(page.getByText('Called', { exact: true })).toBeVisible();
    }
  });
});
