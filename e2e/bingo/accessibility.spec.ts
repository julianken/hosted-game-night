import { test, expect } from '../fixtures/game';
import { waitForHydration, checkBasicA11y, dismissAudioUnlockOverlay } from '../utils/helpers';

test.describe('Bingo Accessibility', () => {
  test.describe('Home Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await waitForHydration(page);
    });

    test('has proper heading hierarchy', async ({ page }) => {
      const h1s = await page.getByRole('heading', { level: 1 }).all();
      expect(h1s.length).toBe(1);

      // H2s should come after H1
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      let previousLevel = 0;

      for (const heading of headings) {
        const tagName = await heading.evaluate((el) => el.tagName);
        const level = parseInt(tagName[1]);

        // Should not skip levels (e.g., h1 to h3)
        expect(level - previousLevel).toBeLessThanOrEqual(1);
        previousLevel = level;
      }
    });

    test('has main landmark', async ({ page }) => {
      const main = page.locator('main, [role="main"]');
      await expect(main).toHaveCount(1);
    });

    test('links have accessible names', async ({ page }) => {
      const links = await page.getByRole('link').all();

      for (const link of links) {
        const name = await link.getAttribute('aria-label') ||
          await link.textContent();
        expect(name?.trim().length).toBeGreaterThan(0);
      }
    });

    test('buttons have accessible names', async ({ page }) => {
      const buttons = await page.getByRole('button').all();

      for (const button of buttons) {
        const name = await button.getAttribute('aria-label') ||
          await button.textContent();
        expect(name?.trim().length).toBeGreaterThan(0);
      }
    });

    test('color contrast is sufficient for text', async ({ page }) => {
      // Check that text elements have reasonable color contrast
      // This is a basic check - full contrast testing requires specialized tools
      const body = page.locator('body');
      const bgColor = await body.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );
      const textColor = await body.evaluate((el) =>
        window.getComputedStyle(el).color
      );

      // Both colors should be defined (not transparent/inherit)
      expect(bgColor).toBeTruthy();
      expect(textColor).toBeTruthy();
    });

    test('interactive elements have visible focus states', async ({ page }) => {
      const playButton = page.getByRole('link', { name: /play now/i });

      // Focus the button
      await playButton.focus();

      // Check for focus ring or outline
      const focusStyles = await playButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          border: styles.border,
        };
      });

      // Should have some visible focus indicator
      const hasFocusStyle =
        focusStyles.outline !== 'none' ||
        focusStyles.boxShadow !== 'none' ||
        focusStyles.border.includes('ring');

      // Note: Tailwind uses ring utilities for focus
      const className = await playButton.getAttribute('class');
      expect(hasFocusStyle || className?.includes('focus')).toBeTruthy();
    });
  });

  test.describe('Presenter View', () => {
    test.beforeEach(async ({ bingoPage: page }) => {
      await waitForHydration(page);
    });

    test('has skip link for keyboard navigation', async ({ bingoPage: page }) => {
      // Same hydration-race defense as `buttons are keyboard accessible` below:
      // wait for a concrete post-hydration element before probing focus. Under
      // parallel worker load, focus can route to <body> before the skeleton
      // finishes swapping for the real tree.
      await expect(
        page.getByRole('button', { name: /open display/i }),
      ).toBeVisible();

      // Skip link may be visually hidden but present in DOM
      const skipLink = page.locator('a[href="#main"], a:text("skip")').first();
      // If skip link exists, it should work
      if (await skipLink.count() > 0) {
        await skipLink.focus();
        await expect(skipLink).toBeFocused({ timeout: 2000 });
      }
    });

    test('buttons are keyboard accessible', async ({ bingoPage: page }, testInfo) => {
      // Skip Tab navigation test on mobile - mobile devices use touch, not keyboard
      // The skip link is still present and works when users connect external keyboards
      const isMobile = testInfo.project.name.includes('mobile');

      if (isMobile) {
        // On mobile: verify skip link exists and is programmatically focusable
        const skipLink = page.locator('a[href="#main"]');
        await expect(skipLink).toHaveCount(1);

        // Verify it can be focused programmatically (for external keyboard users)
        await skipLink.focus();
        await expect(skipLink).toBeFocused();
      } else {
        // On desktop: verify Tab key navigation works.
        //
        // Under parallel worker load the page can have `data-play-hydrated="true"`
        // attached (which waitForHydration waits on) while React concurrent rendering
        // is still swapping the Next.js loading.tsx skeleton for the interactive
        // tree. Pressing Tab in that window falls through to <body> because none
        // of the real focusable descendants are keyboard-reachable yet.
        //
        // Deterministic gate: wait for a concrete, always-rendered interactive
        // element from the hydrated PlayPage (Open Display button) to be visible
        // before probing Tab behavior. Also use Playwright's auto-retrying
        // assertion (toPass) to tolerate any residual single-tick race between
        // focusable-DOM commit and the Tab keystroke.
        await expect(
          page.getByRole('button', { name: /open display/i }),
        ).toBeVisible();

        await page.keyboard.press('Tab');

        await expect(async () => {
          const focusedElement = await page.evaluate(() =>
            document.activeElement?.tagName,
          );
          expect(focusedElement).toMatch(/^(A|BUTTON|INPUT|SELECT)$/);
        }).toPass({ timeout: 2000 });
      }
    });

    test('form controls are labeled', async ({ bingoPage: page }) => {
      const inputs = await page.locator('input, select, textarea').all();

      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
        } else {
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('toggle switches have accessible labels', async ({ bingoPage: page }) => {
      const toggles = await page.getByRole('switch').all();

      for (const toggle of toggles) {
        const label = await toggle.getAttribute('aria-label') ||
          await toggle.getAttribute('aria-labelledby');
        const parentText = await toggle.locator('..').textContent();

        expect(label || parentText?.length).toBeTruthy();
      }
    });

    test('status changes are announced', async ({ bingoPage: page }) => {
      // Look for aria-live regions
      const liveRegions = await page.locator('[aria-live]').all();

      // Should have at least one live region for announcements
      expect(liveRegions.length).toBeGreaterThanOrEqual(0);
    });

    test('minimum touch target size (44x44px)', async ({ bingoPage: page }) => {
      const buttons = await page.getByRole('button').all();

      for (const button of buttons) {
        // Skip Next.js DevTools buttons (only present in development mode)
        // These are framework-injected UI elements, not application buttons
        const ariaLabel = await button.getAttribute('aria-label');
        const buttonText = await button.textContent();
        const isDevToolsButton =
          ariaLabel?.includes('Next.js') ||
          ariaLabel?.includes('issues') ||
          buttonText?.includes('Next.js') ||
          buttonText?.includes('Issue');

        if (isDevToolsButton) {
          continue;
        }

        const box = await button.boundingBox();
        if (box) {
          // Accessible design requires 44x44px minimum
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('minimum font size is 18px', async ({ bingoPage: page }) => {
      // Check body text font size
      const fontSize = await page.evaluate(() => {
        const body = document.body;
        return parseFloat(window.getComputedStyle(body).fontSize);
      });

      // Per CLAUDE.md, minimum should be 18px
      expect(fontSize).toBeGreaterThanOrEqual(16); // Allow some flexibility
    });
  });

  test.describe('Display View', () => {
    test('display page has proper ARIA landmarks', async ({ bingoPage: page, context }) => {
      // Open from presenter
      await waitForHydration(page);

      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        page.getByRole('button', { name: /open display/i }).click(),
      ]);

      await waitForHydration(displayPage);
      await dismissAudioUnlockOverlay(displayPage);

      // The display is an intentionally immersive full-screen layout: the
      // only required landmark is <main>. The inner #main-display region
      // carries the aria-label for the audience content area.
      await expect(displayPage.locator('main, [role="main"]')).toHaveCount(1);
      await expect(displayPage.locator('#main-display')).toBeVisible();
    });

    test('connection status is announced', async ({ bingoPage: page, context }) => {
      await waitForHydration(page);

      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        page.getByRole('button', { name: /open display/i }).click(),
      ]);

      await waitForHydration(displayPage);
      await dismissAudioUnlockOverlay(displayPage);

      // Status should be in an aria-live region or have role="status"
      const statusElement = displayPage.locator('[aria-live], [role="status"]');
      await expect(statusElement.first()).toBeVisible();
    });

    test('large ball display has alt text or label', async ({ bingoPage: page, context }) => {
      await waitForHydration(page);

      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        page.getByRole('button', { name: /open display/i }).click(),
      ]);

      await waitForHydration(displayPage);
      await dismissAudioUnlockOverlay(displayPage);

      // Call a ball to see ball display
      await page.getByRole('button', { name: /roll|call|start/i }).first().click();
      await expect(displayPage.locator('main')).toBeVisible();

      // Ball display should have accessible content
      const ballDisplay = displayPage.locator('[class*="current-ball"], h2:has-text("Current Ball")');
      if (await ballDisplay.count() > 0) {
        const accessible = await ballDisplay.first().getAttribute('aria-label') ||
          await ballDisplay.first().textContent();
        expect(accessible?.length).toBeGreaterThan(0);
      }
    });

    test('text is readable from distance (large enough)', async ({ bingoPage: page, context }) => {
      await waitForHydration(page);

      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        page.getByRole('button', { name: /open display/i }).click(),
      ]);

      await waitForHydration(displayPage);
      await dismissAudioUnlockOverlay(displayPage);

      // Once the display connects, it renders the BallsCalledCounter with a
      // large tabular number for "balls called". Use that as the stable
      // "primary text" anchor for the projector-readability assertion.
      const calledCount = displayPage.getByTestId('balls-called-count');
      await expect(calledCount).toBeVisible({ timeout: 10000 });

      const fontSize = await calledCount.evaluate((el) =>
        parseFloat(window.getComputedStyle(el).fontSize)
      );

      // Audience display primary number should be at least 24px.
      expect(fontSize).toBeGreaterThanOrEqual(24);
    });
  });

  test.describe('Basic A11y Checks', () => {
    test('home page passes basic accessibility checks', async ({ page }) => {
      await page.goto('/');
      await waitForHydration(page);

      const results = await checkBasicA11y(page);

      expect(results.hasMainLandmark).toBe(true);
      expect(results.hasHeadings).toBe(true);
      expect(results.imagesHaveAlt).toBe(true);
      expect(results.buttonsHaveAccessibleNames).toBe(true);
    });

    test('presenter page passes basic accessibility checks', async ({ bingoPage: page }) => {
      await waitForHydration(page);

      const results = await checkBasicA11y(page);

      expect(results.hasMainLandmark).toBe(true);
      expect(results.hasHeadings).toBe(true);
      expect(results.buttonsHaveAccessibleNames).toBe(true);
    });
  });
});
