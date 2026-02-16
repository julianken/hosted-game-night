import { test as base, Page, BrowserContext, expect } from '@playwright/test';
import { waitForHydration, waitForSyncConnection } from './helpers';

/**
 * Extended test fixtures for Joolie Boolie.
 */

export interface BingoTestFixtures {
  /** Presenter page at /play */
  presenterPage: Page;
  /** Display page opened from presenter */
  displayPage: Page;
}

export interface TriviaTestFixtures {
  /** Presenter page at /play */
  presenterPage: Page;
  /** Display page opened from presenter */
  displayPage: Page;
}

/**
 * Extended test with Bingo-specific fixtures.
 */
export const bingoTest = base.extend<BingoTestFixtures>({
  presenterPage: async ({ page }, use) => {
    await page.goto('/play');
    await waitForHydration(page);
    await use(page);
  },

  displayPage: async ({ presenterPage, context }, use) => {
    // Open display window from presenter
    const [displayPage] = await Promise.all([
      context.waitForEvent('page'),
      presenterPage.getByRole('button', { name: /open display/i }).click(),
    ]);

    await waitForHydration(displayPage);
    // Wait for sync to establish
    await expect(displayPage.getByText(/audience display/i)).toBeVisible();

    await use(displayPage);
  },
});

/**
 * Extended test with Trivia-specific fixtures.
 */
export const triviaTest = base.extend<TriviaTestFixtures>({
  presenterPage: async ({ page }, use) => {
    await page.goto('/play');
    await waitForHydration(page);
    await use(page);
  },

  displayPage: async ({ presenterPage, context }, use) => {
    // Find and click the Open Display button
    const openDisplayBtn = presenterPage.getByRole('button', { name: /open display/i });

    const [displayPage] = await Promise.all([
      context.waitForEvent('page'),
      openDisplayBtn.click(),
    ]);

    await waitForHydration(displayPage);
    await expect(displayPage.getByText(/audience display/i)).toBeVisible();

    await use(displayPage);
  },
});

/**
 * Dual-screen test helper.
 * Sets up both presenter and display pages with sync established.
 */
export async function setupDualScreen(
  context: BrowserContext,
  baseURL: string
): Promise<{ presenter: Page; display: Page }> {
  const presenter = await context.newPage();
  await presenter.goto(`${baseURL}/play`);
  await waitForHydration(presenter);

  // Open display from presenter
  const [display] = await Promise.all([
    context.waitForEvent('page'),
    presenter.getByRole('button', { name: /open display/i }).click(),
  ]);

  await waitForHydration(display);

  // Wait for sync to be established on both pages
  await waitForSyncConnection(presenter);

  return { presenter, display };
}

/**
 * Test data: Bingo ball patterns for testing.
 */
export const testPatterns = {
  singleLine: 'Single Line (Horizontal)',
  diagonal: 'Diagonal',
  fullCard: 'Full Card (Blackout)',
  fourCorners: 'Four Corners',
} as const;

/**
 * Test data: Sample trivia teams.
 */
export const testTeams = [
  { name: 'Table 1', score: 0 },
  { name: 'Table 2', score: 0 },
  { name: 'Table 3', score: 0 },
] as const;

/**
 * Keyboard shortcuts reference for Bingo.
 */
export const bingoShortcuts = {
  roll: 'Space',
  pause: 'KeyP',
  undo: 'KeyU',
  reset: 'KeyR',
  mute: 'KeyM',
} as const;

/**
 * Keyboard shortcuts reference for Trivia.
 */
export const triviaShortcuts = {
  navigateUp: 'ArrowUp',
  navigateDown: 'ArrowDown',
  peek: 'KeyP',
  display: 'KeyD',
  reset: 'KeyR',
} as const;

/**
 * Assert that two pages are showing the same ball.
 */
export async function assertSyncedBall(
  presenterPage: Page,
  displayPage: Page
): Promise<void> {
  // Get ball from presenter's current ball display
  const presenterBall = await presenterPage
    .locator('h2:has-text("Current Ball") ~ div')
    .first()
    .textContent();

  // Get ball from display's large ball
  const displayBall = await displayPage
    .locator('[class*="text-8xl"], [class*="text-9xl"]')
    .first()
    .textContent();

  // They should match (allowing for whitespace differences)
  expect(presenterBall?.trim()).toBe(displayBall?.trim());
}

/**
 * Wait for a ball to be called (bingo).
 */
export async function waitForBallCalled(page: Page): Promise<string> {
  // Wait for ball counter to increase from 0
  await expect(async () => {
    const counter = page.locator('text=/\\d+\\s*(called|of)/i').first();
    const text = await counter.textContent();
    const match = text?.match(/(\d+)/);
    const count = match ? parseInt(match[1], 10) : 0;
    expect(count).toBeGreaterThan(0);
  }).toPass({ timeout: 10000 });

  // Get the current ball
  const ballText = await page
    .locator('[class*="ball-"]')
    .filter({ hasText: /^[BINGO]-?\d+$/ })
    .first()
    .textContent();

  return ballText || '';
}
