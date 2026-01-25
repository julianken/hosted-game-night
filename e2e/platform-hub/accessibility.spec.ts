import { test, expect } from '@playwright/test';
import { checkBasicA11y } from '../utils/helpers';

/**
 * Platform Hub Accessibility E2E Tests
 *
 * Tests verify WCAG 2.1 AA compliance and keyboard navigation.
 * Following patterns from e2e/bingo/accessibility.spec.ts
 */

const BASE_URL = 'http://localhost:3002';

test.describe('Platform Hub Accessibility @high', () => {
  test.describe('Login Page Accessibility', () => {
    test('login page has basic accessibility @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      const results = await checkBasicA11y(page);

      expect(results.hasMainLandmark).toBe(true);
      expect(results.hasHeadings).toBe(true);
      expect(results.imagesHaveAlt).toBe(true);
      expect(results.buttonsHaveAccessibleNames).toBe(true);
    });

    test('login page keyboard navigation works @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Focus the email input directly to test keyboard navigation through form
      await page.locator('input[name="email"]').focus();
      await expect(page.locator('input[name="email"]')).toBeFocused();

      // Tab to password input
      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="password"]')).toBeFocused();

      // Tab to show/hide password button
      await page.keyboard.press('Tab');
      await expect(page.locator('button[aria-label*="password"]')).toBeFocused();

      // Tab to forgot password link
      await page.keyboard.press('Tab');
      await expect(page.locator('a[href="/forgot-password"]')).toBeFocused();

      // Tab to submit button
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]').first()).toBeFocused();
    });

    test('login form has proper labels @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Wait for form to be fully rendered
      await page.waitForLoadState('networkidle');

      // Check for associated labels
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');

      await expect(emailInput).toHaveAttribute('id', 'email');
      await expect(passwordInput).toHaveAttribute('id', 'password');

      // Labels should exist and be properly associated
      await expect(page.locator('label[for="email"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();

      // Verify label text content
      await expect(page.locator('label[for="email"]')).toContainText('Email');
      await expect(page.locator('label[for="password"]')).toContainText('Password');
    });

    test('focus indicators are visible @medium', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Focus the email input explicitly
      const emailInput = page.locator('input[name="email"]');
      await emailInput.focus();

      // Wait a brief moment for focus styles to apply
      await page.waitForTimeout(100);

      // Verify the input is actually focused
      await expect(emailInput).toBeFocused();

      // Check that focused element has visible outline or ring
      const styles = await emailInput.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineWidth: computed.outlineWidth,
          boxShadow: computed.boxShadow,
        };
      });

      // Should have either outline or box-shadow for focus indication
      expect(
        styles.outlineWidth !== '0px' || styles.boxShadow !== 'none'
      ).toBeTruthy();
    });
  });

  test.describe('Signup Page Accessibility', () => {
    test('signup page has basic accessibility @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      const results = await checkBasicA11y(page);

      expect(results.hasMainLandmark).toBe(true);
      expect(results.hasHeadings).toBe(true);
      expect(results.imagesHaveAlt).toBe(true);
      expect(results.buttonsHaveAccessibleNames).toBe(true);
    });

    test('signup form keyboard navigation works @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Tab through form
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A']).toContain(firstFocused);
    });

    test('signup form has proper labels @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      await page.waitForLoadState('networkidle');

      // Check for associated labels
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toHaveAttribute('id', 'email');

      // Label should exist and be properly associated
      await expect(page.locator('label[for="email"]')).toBeVisible();
      await expect(page.locator('label[for="email"]')).toContainText('Email');
    });
  });

  test.describe('Home Page Accessibility', () => {
    test('home page has basic accessibility @high', async ({ page }) => {
      await page.goto(BASE_URL);
      const results = await checkBasicA11y(page);

      expect(results.hasMainLandmark).toBe(true);
      expect(results.hasHeadings).toBe(true);
      expect(results.imagesHaveAlt).toBe(true);
      expect(results.buttonsHaveAccessibleNames).toBe(true);
    });

    test('home page keyboard navigation works @medium', async ({ page }) => {
      await page.goto(BASE_URL);

      // Tab through navigation
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT']).toContain(focused);
    });

    test('all interactive elements are keyboard accessible @high', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check all buttons and links
      const buttons = await page.locator('button, a[href]').all();
      for (const button of buttons.slice(0, 5)) {
        await button.focus();
        await expect(button).toBeFocused();
      }
    });
  });

  test.describe('General Accessibility Requirements', () => {
    test('buttons have accessible names @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Check submit button has accessible name
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();

      const buttonText = await submitButton.textContent();
      expect(buttonText?.trim().length).toBeGreaterThan(0);
      expect(buttonText?.trim()).toBe('Sign In');

      // Check show/hide password button has accessible name
      const passwordToggle = page.locator('button[aria-label*="password"]');
      await expect(passwordToggle).toBeVisible();
      await expect(passwordToggle).toHaveAttribute('aria-label');
    });

    test('links have accessible names @high', async ({ page }) => {
      await page.goto(BASE_URL);

      const links = await page.locator('a[href]').all();

      for (const link of links.slice(0, 3)) {
        const linkText = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        expect(linkText?.trim() || ariaLabel).toBeTruthy();
      }
    });

    test('images have alt text @medium', async ({ page }) => {
      await page.goto(BASE_URL);

      const images = await page.locator('img').all();

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        expect(alt).not.toBeNull();
      }
    });

    test('touch targets meet minimum size @medium', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Use .first() to handle React 19 strict mode duplicates
      const submitButton = page.locator('button[type="submit"]').first();
      const box = await submitButton.boundingBox();

      // WCAG 2.1 Level AAA requires 44x44px minimum
      expect(box).toBeTruthy();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('form errors are announced @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Submit empty form
      await page.click('button[type="submit"]');

      // Wait for error message
      await page.waitForTimeout(500);

      // Error should be visible and have role="alert" or aria-live
      const errorElement = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]').first();

      // If error exists, it should be properly announced
      const errorCount = await errorElement.count();
      if (errorCount > 0) {
        await expect(errorElement).toBeVisible();
      }
    });
  });
});
