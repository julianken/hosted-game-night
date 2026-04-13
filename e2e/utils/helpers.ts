import { Page, expect } from '@playwright/test';

/**
 * Wait for the Next.js app to fully hydrate.
 *
 * Asserts that <main> has rendered at least one visible child element. This is
 * a "DOM exists" smoke check, intentionally agnostic to specific element types
 * (button, link, heading, svg). Post-standalone-conversion the home pages and
 * invalid-session display screens use only <Link>/<a> and <svg> elements, so
 * the previous "must have a button" contract was too strict.
 *
 * Real test assertions that follow waitForHydration still verify specific UI
 * (getByRole('heading'), getByRole('link'), etc.), so this helper acts as a
 * lightweight smoke gate rather than a full hydration probe.
 *
 * Behavior-based (not copy-based) so it is robust to user-facing copy edits.
 *
 * See docs/plans/BEA-697-e2e-baseline-fix.md for the full rationale (Option B).
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  // A hydrated page must render at least one visible element inside <main>.
  // Both bingo and trivia apps use <main> as the primary landmark on every page.
  await expect(async () => {
    const mainContent = page.locator('main').locator(':visible').first();
    await expect(mainContent).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 5000 });
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

  await displayPage.waitForLoadState('domcontentloaded');
  // Wait for display page to hydrate with interactive content
  await expect(async () => {
    const hasContent = await displayPage.locator('body').evaluate(
      (body) => body.children.length > 0
    );
    expect(hasContent).toBe(true);
  }).toPass({ timeout: 5000 });
  return displayPage;
}

/**
 * Click a button by its accessible name (role-based).
 * Uses force: true to bypass Next.js DevTools overlay that intercepts pointer events in dev mode.
 */
export async function clickButton(page: Page, name: string | RegExp): Promise<void> {
  await page.getByRole('button', { name }).click({ force: true });
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
 * Press a keyboard shortcut.
 * Pattern 2: No wait needed - caller should check for state change
 * Keyboard events are synchronous in Playwright
 */
export async function pressKey(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
  // No wait needed - keyboard events are processed immediately
  // Caller should use expect().toBeVisible() or other deterministic waits
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
      const role = btn.getAttribute('role');

      // Skip toggle switches - they use a different accessibility pattern
      // Toggle switches are validated separately and may rely on surrounding labels
      if (role === 'switch') return false;

      // Skip Next.js DevTools buttons (only present in development mode)
      // Check:
      // 1. aria-label containing Next.js, issue, or collapse keywords
      // 2. Text content containing Next.js or issue keywords
      // 3. Buttons that are children of Next.js dev tools container (look for parent with data-nextjs-toast-wrapper)
      const parentElement = btn.parentElement;
      const isInDevToolsContainer =
        parentElement?.hasAttribute('data-nextjs-toast-wrapper') ||
        parentElement?.className?.includes('nextjs') ||
        btn.closest('[data-nextjs-toast-wrapper]');

      const isDevToolsButton =
        isInDevToolsContainer ||
        (hasAriaLabel && (
          hasAriaLabel.toLowerCase().includes('next.js') ||
          hasAriaLabel.toLowerCase().includes('issue') ||
          hasAriaLabel.toLowerCase().includes('collapse')
        )) ||
        (hasText && (
          hasText.toLowerCase().includes('next.js') ||
          hasText.toLowerCase().includes('issue')
        ));

      if (isDevToolsButton) return false;

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
 * Wait for dual-screen sync to be established between presenter and display.
 *
 * Sync readiness is signalled on either page — this helper polls both:
 *  - Trivia display sets `data-connected="true"` on <main> when connected
 *  - Bingo presenter's sync-indicator contains a bg-success dot when connected
 *  - Either page may render other bg-success/bg-green-500 markers
 *
 * @param displayPage - The display (popup) page
 * @param timeout - Maximum time to wait in milliseconds
 */
export async function waitForDualScreenSync(displayPage: Page, timeout = 10000): Promise<void> {
  // Derive presenter page from the opener if available (Playwright exposes it
  // via `page.opener()`). Falls back to just polling the display.
  const presenterPage = await displayPage.opener().catch(() => null);

  await expect(async () => {
    const displayIndicator = displayPage.locator(
      '[class*="bg-success"], [class*="bg-green-500"], [data-connected="true"]'
    ).first();

    const displayVisible = await displayIndicator
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (displayVisible) return;

    if (presenterPage && !presenterPage.isClosed()) {
      const presenterIndicator = presenterPage.locator(
        '[data-testid="sync-indicator"] [class*="bg-success"], [data-testid="sync-indicator"] [class*="bg-green-500"]'
      ).first();
      const presenterVisible = await presenterIndicator
        .isVisible({ timeout: 500 })
        .catch(() => false);
      if (presenterVisible) return;
    }

    throw new Error('Dual-screen sync indicator not yet visible on display or presenter.');
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
 * Wait for the bingo display's balls-called counter to reach at least N.
 *
 * Uses `data-testid="balls-called-count"` which renders on both presenter and
 * display. Stable against copy changes; behavior-based assertion.
 *
 * @param displayPage - The display (popup) page
 * @param minimum - Minimum expected count (default: 1)
 * @param timeout - Maximum time to wait in milliseconds
 */
export async function waitForDisplayBallCount(
  displayPage: Page,
  minimum = 1,
  timeout = 15000,
): Promise<void> {
  await expect(async () => {
    const countText = await displayPage.getByTestId('balls-called-count').textContent();
    const num = parseInt(countText || '0', 10);
    expect(num).toBeGreaterThanOrEqual(minimum);
  }).toPass({ timeout });
}

/**
 * Dismiss the bingo display's audio-unlock overlay if present.
 *
 * The `/display` page for bingo renders a full-screen click-to-activate
 * overlay (data-testid="audio-unlock-overlay") that blocks pointer events
 * until the user interacts. In E2E we click it so subsequent assertions
 * against the underlying display UI are not obstructed.
 *
 * No-op if the overlay isn't visible (e.g., invalid-session display).
 */
export async function dismissAudioUnlockOverlay(displayPage: Page): Promise<void> {
  const overlay = displayPage.getByTestId('audio-unlock-overlay');
  try {
    await overlay.waitFor({ state: 'visible', timeout: 2000 });
  } catch {
    return;
  }
  await overlay.click();
  await overlay.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {
    // Some browsers may keep the node around briefly; best-effort dismissal.
  });
}

/**
 * Start a trivia game by navigating the SetupGate wizard overlay.
 *
 * Navigates to the Teams step, adds the requested number of teams,
 * navigates to the Review step, and clicks Start Game. The overlay
 * unmounts after the game starts (200ms fade-out), leaving the
 * dashboard fully accessible and interactive.
 *
 * The overlay itself is tested in setup-overlay.spec.ts which uses the
 * `triviaPageWithQuestions` fixture to keep it visible.
 *
 * @param page - Playwright page instance
 * @param teamCount - Number of teams to add (default: 2 — step 2 gating requires teams >= 2)
 * @param timeout - Maximum time to wait for transitions (default: 15000ms)
 */
export async function startGameViaWizard(page: Page, teamCount = 2, timeout = 15000): Promise<void> {
  // BEA-715: Hydration-ready gate.
  // page.goto(..., { waitUntil: 'load' }) only guarantees the JS bundle loaded —
  // not that React has hydrated and not that zustand persist has finished
  // rehydrating from localStorage. Under React 19 + AnimatePresence, the wizard
  // step buttons exist in the DOM before their event handlers are wired up.
  // PlayPage sets data-settings-hydrated="true" once useSettingsStore.persist
  // has finished hydrating AND the component has mounted, so we gate on that
  // attribute before any wizard interaction.
  await expect(
    page.locator('[data-settings-hydrated="true"]')
  ).toBeVisible({ timeout: 10_000 });

  const gate = page.locator('[data-testid="setup-gate"]');

  // Check if the setup gate is visible — if not, game may already be started
  try {
    await gate.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    // Gate not visible — already dismissed or game already started
    return;
  }

  // Scope all interactions to the overlay to avoid strict-mode violations
  // (the dashboard behind the overlay also has matching elements)

  // Navigate to Teams step (wizard step index 2).
  // SetupWizard.goToStep silently refuses to advance past step 0 (Questions)
  // if questions.length === 0. The `triviaPageWithQuestions` /
  // `triviaGameStarted` fixtures seed questions via
  // window.__triviaE2EQuestions (see e2e/utils/trivia-fixtures.ts); if that
  // seed is missing, the click below will be a no-op and the Add Team button
  // lookup will time out with a cryptic "element not visible" error.
  //
  // Defense-in-depth: even with the hydration gate above, retry the click
  // until the step button reports aria-current="step" (the SetupWizard
  // step indicator pattern). This catches any residual race where the click
  // lands but React hasn't wired the handler yet.
  const stepButton = gate.locator('[data-testid="wizard-step-2"]');
  try {
    await expect(async () => {
      await stepButton.click();
      await expect(stepButton).toHaveAttribute('aria-current', 'step', {
        timeout: 750,
      });
    }).toPass({ timeout: 5000 });
  } catch (err) {
    throw new Error(
      '[startGameViaWizard] Wizard step 2 (Teams) did not activate after click. ' +
        'Most likely causes: (1) hydration race — the click landed before React ' +
        'attached the handler (BEA-715 gate should prevent this); (2) the trivia ' +
        'game store has zero questions, so SetupWizard.isStepComplete(0) returned ' +
        'false and goToStep(2) was a no-op. Check that e2e/fixtures/auth.ts calls ' +
        'addInitScript with buildTriviaSeedInitScript() before navigating. ' +
        `Underlying error: ${(err as Error).message}`
    );
  }

  const addTeamBtn = gate.getByRole('button', { name: /add team/i });
  await expect(addTeamBtn).toBeVisible({ timeout: 5000 });

  // Add the requested number of teams
  for (let i = 0; i < teamCount; i++) {
    await addTeamBtn.click();
    // Wait for team to appear within the overlay
    await expect(gate.getByText(new RegExp(`table ${i + 1}`, 'i'))).toBeVisible();
  }

  // Navigate to Review step (wizard step index 3)
  await gate.locator('[data-testid="wizard-step-3"]').click();

  // Click Start Game (wait for it to be enabled first)
  const startBtn = gate.getByRole('button', { name: /start game/i });
  await expect(startBtn).toBeEnabled({ timeout: 5000 });
  await startBtn.click();

  // Wait for overlay to fade out (200ms) and unmount
  await gate.waitFor({ state: 'detached', timeout });
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
  timeout = 15000  // Increased from 10000ms
): Promise<void> {
  // First verify sync is established
  await waitForDualScreenSync(displayPage, 10000);

  // Then wait for content
  await expect(async () => {
    const content = displayPage.getByText(pattern);
    await expect(content.first()).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout });
}
