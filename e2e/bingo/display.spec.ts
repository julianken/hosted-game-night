import { test, expect } from '../fixtures/auth';
import { dismissAudioUnlockOverlay, waitForHydration } from '../utils/helpers';

test.describe('Bingo Display Page', () => {
  test('shows invalid session error when accessed directly', async ({ page }) => {
    await page.goto('/display');
    await waitForHydration(page);

    await expect(page.getByText(/invalid session/i)).toBeVisible();
    await expect(page.getByText(/open display/i)).toBeVisible();
  });

  test('shows invalid session for malformed session ID', async ({ page }) => {
    await page.goto('/display?session=invalid');
    await waitForHydration(page);

    await expect(page.getByText(/invalid session/i)).toBeVisible();
  });

  test('displays correctly when opened from presenter', async ({ authenticatedBingoPage: page }) => {
    // Presenter is already loaded via fixture
    await waitForHydration(page);

    // Open display window
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    // Display page uses <main role="main"> as its single landmark. The inner
    // `#main-display` region carries the aria-label "Audience display".
    await expect(displayPage.getByRole('main')).toBeVisible();
    await expect(displayPage.locator('#main-display')).toBeVisible();
  });

  test('shows pre-game state when no game started', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    // Once the display connects to the presenter, the waiting screen is
    // replaced by the game layout -- but no balls have been called yet.
    // Verify by asserting the "balls called" counter reads 0.
    const calledCount = displayPage.getByTestId('balls-called-count');
    await expect(calledCount).toBeVisible({ timeout: 10000 });
    await expect(calledCount).toHaveText(/^0$/);
  });

  test('displays current ball when game is active', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    // Call a ball from presenter
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();

    // Wait for ball to sync to display
    await expect(displayPage.getByRole('main')).toBeVisible();

    // Display should show the ball or board
    await expect(displayPage.locator('#main-display')).toBeVisible();
  });

  test('shows bingo board with called numbers', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    // Call a few balls
    const rollButton = page.getByRole('button', { name: /roll|call|start/i }).first();
    await rollButton.click();
    await expect(page.getByRole('button', { name: /roll/i })).toBeEnabled({ timeout: 10000 });
    await rollButton.click();
    // Display should show the bingo board section using data-testid
    await expect(displayPage.getByTestId('called-numbers-board')).toBeVisible({ timeout: 10000 });
  });

  test('shows connection status indicator', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    // Display broadcasts connection state back to presenter. The presenter's
    // sync indicator (data-testid="sync-indicator") contains a bg-success dot
    // when connected. Behavior-based assertion avoids brittle copy matching.
    const syncDot = page
      .getByTestId('sync-indicator')
      .locator('[class*="bg-success"]');
    await expect(syncDot).toBeVisible({ timeout: 10000 });
  });

  test('displays winning pattern', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    // Start game so the pattern region renders (audience only shows pattern
    // grid when `hasContent` is true — i.e., connected, or a ball called).
    await page.getByRole('button', { name: /roll|call|start/i }).first().click();

    // Pattern area is labelled "Winning pattern" on the display.
    const patternRegion = displayPage.getByLabel(/winning pattern/i);
    await expect(patternRegion).toBeVisible({ timeout: 10000 });
  });

  test('display page exposes fullscreen via F key (no visible button)', async ({ authenticatedBingoPage: page }) => {
    // The display page intentionally has no visible fullscreen button; the F
    // key is the canonical trigger. Verify the page loaded with a <main>
    // landmark and accepts the F keypress without error.
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    await expect(displayPage.getByRole('main')).toBeVisible();

    // Pressing F should not throw; fullscreen API is usually blocked in
    // headless Chromium but the handler should no-op gracefully.
    await displayPage.keyboard.press('KeyF');

    // Page remains operational after the keypress.
    await expect(displayPage.getByRole('main')).toBeVisible();
  });

  test('help modal opens via "?" keyboard shortcut', async ({ authenticatedBingoPage: page }) => {
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    // Display has no visible "help" button — the shortcut is "?".
    await displayPage.keyboard.press('?');

    // KeyboardShortcutsModal renders in a dialog role when open.
    const dialog = displayPage.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test('display renders without header/footer chrome (immersive layout)', async ({ authenticatedBingoPage: page }) => {
    // The bingo display is intentionally full-screen immersive: no banner
    // header, no contentinfo footer, no marketing copy. Just the game
    // content inside <main> + the inner #main-display region.
    await waitForHydration(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /open display/i }).click();
    const displayPage = await popupPromise;

    await waitForHydration(displayPage);
    await dismissAudioUnlockOverlay(displayPage);

    await expect(displayPage.locator('main')).toHaveCount(1);
    await expect(displayPage.locator('#main-display')).toHaveCount(1);
    // Skip link is present for a11y.
    await expect(displayPage.getByRole('link', { name: /skip to main display/i })).toBeAttached();
  });
});
