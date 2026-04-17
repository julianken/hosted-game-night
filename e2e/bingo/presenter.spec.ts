/**
 * Bingo Presenter View E2E Tests
 *
 * ⚠️ REFACTORED (BEA-383): Replaced all 9 waitForTimeout() calls with deterministic waits
 * - Pattern 1: Wait for element visibility after actions (e.g., ball called, counter updated)
 * - Pattern 2: Wait for state change indicators (e.g., button states, board highlighting)
 * - Pattern 3: Use .toPass() for complex conditions requiring retry logic
 */
import { test, expect } from '../fixtures/game';
import { waitForHydration } from '../utils/helpers';

test.describe('Bingo Presenter View', () => {
  test.beforeEach(async ({ bingoPage: page }) => {
    await waitForHydration(page);
    // Post-BEA-722: wait for the game-store persist hydration gate so actions
    // (pattern select, start/roll, reset) don't race against the merge.
    // Use `attached` because the host element may be covered by an overlay.
    await page
      .locator('[data-play-hydrated="true"]')
      .waitFor({ state: 'attached', timeout: 10_000 });
  });

  test('displays presenter view header @medium', async ({ bingoPage: page }) => {
    // Post-BEA-718 rebrand: heading renders plain "Bingo" (no brand prefix).
    await expect(page.getByRole('heading', { name: /^bingo$/i })).toBeVisible();
    // The "Presenter" badge is identified via aria-label="Presenter view".
    await expect(page.getByLabel('Presenter view')).toBeVisible();
  });

  test('shows Open Display button @high', async ({ bingoPage: page }) => {
    const openDisplayBtn = page.getByRole('button', { name: /open display/i });
    await expect(openDisplayBtn).toBeVisible();
  });

  test('displays bingo board with B-I-N-G-O columns @high', async ({ bingoPage: page }) => {
    // Check for column headers - scope to the bingo board area
    const bingoBoard = page.locator('[class*="board"], [data-testid*="board"], main').first();
    await expect(bingoBoard.getByText('B', { exact: true })).toBeVisible();
    await expect(bingoBoard.getByText('I', { exact: true })).toBeVisible();
    await expect(bingoBoard.getByText('N', { exact: true })).toBeVisible();
    await expect(bingoBoard.getByText('G', { exact: true })).toBeVisible();
    await expect(bingoBoard.getByText('O', { exact: true })).toBeVisible();
  });

  test('shows pattern selector @high', async ({ bingoPage: page }) => {
    // Pattern selector is a labeled native <select> with label "Winning Pattern"
    await expect(page.getByText('Winning Pattern')).toBeVisible();
    await expect(page.getByLabel('Winning Pattern')).toBeVisible();
  });

  test('shows settings section with toggles @medium', async ({ bingoPage: page }) => {
    await expect(page.getByText(/settings/i)).toBeVisible();
    await expect(page.getByText(/auto-call/i)).toBeVisible();
    await expect(page.getByText(/audio announcements/i)).toBeVisible();
  });

  test('displays keyboard shortcuts reference @medium', async ({ bingoPage: page }) => {
    // UI drift (BEA-706): the standalone redesign replaced the dedicated
    // "Keyboard Shortcuts" reference section with inline <kbd> hints on the
    // control buttons themselves. Verify the inline hints + accessible labels.
    //
    // Undo and Reset buttons are visible in the initial idle state and each
    // expose a visible <kbd> and an aria-label announcing the shortcut.
    await expect(page.getByRole('button', { name: /undo last call \(u\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /reset game \(r\)/i })).toBeVisible();

    // Inline <kbd> shortcut hints are rendered alongside the button labels.
    const undoButton = page.getByRole('button', { name: /undo last call \(u\)/i });
    const resetButton = page.getByRole('button', { name: /reset game \(r\)/i });
    await expect(undoButton.locator('kbd', { hasText: 'U' })).toBeVisible();
    await expect(resetButton.locator('kbd', { hasText: 'R' })).toBeVisible();
  });

  test('shows ball counter at zero initially @high', async ({ bingoPage: page }) => {
    // Ball counter shows number and "Called" as separate elements
    // Use exact match to avoid matching "Called Numbers" heading and other text
    await expect(page.getByText('0').first()).toBeVisible();
    await expect(page.getByText('Called', { exact: true })).toBeVisible();
  });

  test('can select a pattern @high', async ({ bingoPage: page }) => {
    // Pattern selector is a labeled native <select> (not a button/listbox).
    // Playwright's selectOption works against native <select> elements.
    const patternSelect = page.getByLabel('Winning Pattern');
    await expect(patternSelect).toBeVisible();

    // Select a concrete pattern by its id. "row-top" = "Top Row" in the
    // Lines category (see apps/bingo/src/lib/game/patterns/definitions/lines.ts).
    await patternSelect.selectOption('row-top');

    // Verify the select now reports the chosen pattern and the label remains visible.
    await expect(patternSelect).toHaveValue('row-top');
    await expect(page.getByText('Winning Pattern')).toBeVisible();
  });

  test('can toggle auto-call setting @medium', async ({ bingoPage: page }) => {
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

  test('Start button becomes active @high', async ({ bingoPage: page }) => {
    // Button shows "Start Game" initially, then "Roll [Space]" after game starts
    const startButton = page.getByRole('button', { name: /start game|roll/i });
    await expect(startButton).toBeVisible();
  });

  test('can call a ball with button click @high', async ({ bingoPage: page }) => {
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

  test('displays current ball after calling @high', async ({ bingoPage: page }) => {
    // Call a ball - "Start Game" initially, then "Roll [Space]"
    const rollButton = page.getByRole('button', { name: /start game|roll/i });
    await rollButton.click(); // Start game
    await rollButton.click(); // Call first ball

    // Wait for the ball to be displayed (Pattern 1: element visibility)
    const currentBallSection = page.getByTestId('current-ball-section');
    await expect(currentBallSection).toBeVisible({ timeout: 10000 });
  });

  test('board updates when ball is called @high', async ({ bingoPage: page }) => {
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

  test('can pause and resume the game @medium', async ({ bingoPage: page }) => {
    // Start the game first - "Start Game" initially
    const rollButton = page.getByRole('button', { name: /start game|roll/i });
    await rollButton.click(); // Start game
    await rollButton.click(); // Call first ball

    // Wait for game to start and processing to complete
    // Button shows "Calling..." during processing, then "Roll" when ready
    await expect(async () => {
      const rollButton = page.getByRole('button', { name: /roll|calling/i });
      await expect(rollButton).toBeVisible({ timeout: 1000 });
      const processing = await rollButton.getAttribute('data-processing');
      expect(processing).not.toBe('true');
    }).toPass({ timeout: 10000 });

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

  test('undo removes the last called ball @high', async ({ bingoPage: page }) => {
    // Call two balls first - "Start Game" initially, then "Roll [Space]"
    const rollButton = page.getByRole('button', { name: /start game|roll/i });

    await rollButton.click(); // Start game

    // Wait for game to start (button text changes from "Start Game" to "Roll")
    await expect(page.getByRole('button', { name: /roll/i })).toBeVisible({ timeout: 5000 });

    // Call first ball
    await expect(rollButton).toBeEnabled({ timeout: 5000 });
    await rollButton.click();

    // Wait for first ball to be called and Roll button to be ready
    await expect(async () => {
      const calledCount = page.getByTestId('balls-called-count');
      const countText = await calledCount.textContent();
      expect(parseInt(countText || '0')).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10000 });

    await expect(rollButton).toBeEnabled({ timeout: 5000 });

    // Call second ball
    await rollButton.click();

    // Wait for second ball to be called
    await expect(async () => {
      const calledCount = page.getByTestId('balls-called-count');
      const countText = await calledCount.textContent();
      expect(parseInt(countText || '0')).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });

    // Wait for audio processing to complete before clicking Undo
    await expect(async () => {
      const processing = await rollButton.getAttribute('data-processing');
      expect(processing).toBe('false');
    }).toPass({ timeout: 10000 });

    // Find undo button - should be visible and enabled after calling balls
    const undoButton = page.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeVisible();
    await expect(undoButton).toBeEnabled();

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
  });

  test('reset clears all called balls @high', async ({ bingoPage: page }) => {
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

    // Find reset button - should be visible after calling balls
    const resetButton = page.getByRole('button', { name: /reset/i });
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // May have confirmation dialog (legitimately optional UI). Scope the
    // confirm-button locator to the dialog so Playwright's strict mode isn't
    // tripped by the persistent "Reset game (R)" trigger in the header.
    // The modal has a 250-300ms enter animation, so `isVisible()` can race
    // the fade-in and return false prematurely. Wait for the dialog to attach
    // before deciding whether to click confirm.
    const dialog = page.getByRole('dialog');
    const confirmButton = dialog.getByRole('button', {
      name: /^(confirm|yes|reset)$/i,
    });
    try {
      await expect(confirmButton).toBeVisible({ timeout: 2000 });
      await confirmButton.click();
    } catch {
      // No confirmation dialog — reset was one-click.
    }

    // Wait for reset to complete (Pattern 2: counter back to 0) - use data-testid for precise targeting
    const calledCount = page.getByTestId('balls-called-count');
    await expect(calledCount).toHaveText('0');
    await expect(page.getByText('Called', { exact: true })).toBeVisible();
  });
});
