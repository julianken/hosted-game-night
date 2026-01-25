import { Page, expect } from '@playwright/test';

/**
 * Wait for the Next.js app to fully hydrate.
 * Waits for network idle and a reasonable timeout.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Give React time to hydrate
  await page.waitForTimeout(500);
}

/**
 * Wait for a specific text to appear on the page.
 */
export async function waitForText(page: Page, text: string): Promise<void> {
  await expect(page.getByText(text)).toBeVisible();
}

/**
 * Wait for sync connection to be established.
 * Looks for the green sync indicator dot.
 */
export async function waitForSyncConnection(page: Page): Promise<void> {
  // Wait for the green dot (bg-success or bg-green-500) to appear
  const syncIndicator = page.locator('.bg-success, .bg-green-500').first();
  await expect(syncIndicator).toBeVisible({ timeout: 10000 });
}

/**
 * Open the display window from the presenter view.
 * Returns a promise that resolves to the new page.
 */
export async function openDisplayWindow(page: Page): Promise<Page> {
  const [displayPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: /open display/i }).click(),
  ]);

  await displayPage.waitForLoadState('networkidle');
  return displayPage;
}

/**
 * Click a button by its accessible name (role-based).
 */
export async function clickButton(page: Page, name: string | RegExp): Promise<void> {
  await page.getByRole('button', { name }).click();
}

/**
 * Get the current ball display text from presenter or display page.
 */
export async function getCurrentBallText(page: Page): Promise<string | null> {
  const ballLocator = page.locator('[class*="ball-"]').filter({
    has: page.locator('text=/^[BINGO]-?\\d+$/'),
  });

  const count = await ballLocator.count();
  if (count === 0) return null;

  return ballLocator.first().textContent();
}

/**
 * Extract session ID from URL.
 */
export function extractSessionId(url: string): string | null {
  const urlObj = new URL(url);
  return urlObj.searchParams.get('session');
}

/**
 * Navigate and wait for page to be ready.
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForHydration(page);
}

/**
 * Check if an element has focus.
 */
export async function hasFocus(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    return element === document.activeElement;
  }, selector);
}

/**
 * Press a keyboard shortcut and wait briefly for effect.
 */
export async function pressKey(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
  await page.waitForTimeout(100);
}

/**
 * Get the text content of an element by its test ID or selector.
 */
export async function getTextContent(page: Page, selector: string): Promise<string | null> {
  const element = page.locator(selector).first();
  return element.textContent();
}

/**
 * Check if the page has any accessibility violations using basic checks.
 * For full a11y testing, consider using @axe-core/playwright.
 */
export async function checkBasicA11y(page: Page): Promise<{
  hasMainLandmark: boolean;
  hasHeadings: boolean;
  imagesHaveAlt: boolean;
  buttonsHaveAccessibleNames: boolean;
}> {
  const results = await page.evaluate(() => {
    const main = document.querySelector('main, [role="main"]');
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const images = document.querySelectorAll('img');
    const buttons = document.querySelectorAll('button');

    const imagesWithoutAlt = Array.from(images).filter(
      (img) => !img.getAttribute('alt') && !img.getAttribute('aria-label')
    );

    const buttonsWithoutName = Array.from(buttons).filter((btn) => {
      const hasText = btn.textContent?.trim();
      const hasAriaLabel = btn.getAttribute('aria-label');
      const hasAriaLabelledBy = btn.getAttribute('aria-labelledby');
      return !hasText && !hasAriaLabel && !hasAriaLabelledBy;
    });

    return {
      hasMainLandmark: !!main,
      hasHeadings: headings.length > 0,
      imagesHaveAlt: imagesWithoutAlt.length === 0,
      buttonsHaveAccessibleNames: buttonsWithoutName.length === 0,
    };
  });

  return results;
}

/**
 * Scroll element into view.
 */
export async function scrollIntoView(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
}

/**
 * Wait for a specific number of elements to appear.
 */
export async function waitForElementCount(
  page: Page,
  selector: string,
  count: number,
  timeout = 5000
): Promise<void> {
  await expect(page.locator(selector)).toHaveCount(count, { timeout });
}

/**
 * Get all visible text from elements matching a selector.
 */
export async function getAllVisibleText(page: Page, selector: string): Promise<string[]> {
  const elements = page.locator(selector);
  const texts: string[] = [];
  const count = await elements.count();

  for (let i = 0; i < count; i++) {
    const text = await elements.nth(i).textContent();
    if (text) texts.push(text.trim());
  }

  return texts;
}

/**
 * Wait for room setup modal to appear after session recovery completes.
 * The modal appears after recoveryAttempted state is set to true, which happens
 * in a useEffect AFTER isRecovering becomes false. This creates a timing window
 * where the modal may not be immediately visible.
 *
 * Uses .toPass() pattern to retry until modal is visible or timeout.
 */
export async function waitForRoomSetupModal(page: Page, timeout = 10000): Promise<void> {
  await expect(async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout });
}

/**
 * Wait for dual-screen sync to be established between presenter and display.
 * Checks for the green sync indicator (bg-success or bg-green-500) to appear.
 *
 * @param displayPage - The display window page
 * @param timeout - Maximum time to wait in milliseconds
 */
export async function waitForDualScreenSync(displayPage: Page, timeout = 10000): Promise<void> {
  await expect(async () => {
    const syncIndicator = displayPage.locator('[class*="bg-success"], [class*="bg-green-500"]').first();
    await expect(syncIndicator).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout });
}

/**
 * Wait for a specific condition to be true with polling.
 * Uses .toPass() pattern to retry until condition is met.
 *
 * @param condition - Async function that throws if condition not met
 * @param timeout - Maximum time to wait in milliseconds
 */
export async function waitForCondition(condition: () => Promise<void>, timeout = 10000): Promise<void> {
  await expect(async () => {
    await condition();
  }).toPass({ timeout });
}

/**
 * Wait for sync state change by checking for specific content on display.
 * Polls until the expected content appears.
 *
 * @param displayPage - The display window page
 * @param pattern - Text pattern to wait for
 * @param timeout - Maximum time to wait in milliseconds
 */
export async function waitForSyncedContent(
  displayPage: Page,
  pattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await expect(async () => {
    const content = displayPage.getByText(pattern);
    await expect(content.first()).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout });
}
