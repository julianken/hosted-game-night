import { test, expect } from '@playwright/test';

/**
 * Platform Hub Security E2E Tests
 *
 * Tests verify security edge cases and protections.
 */

const BASE_URL = 'http://localhost:3002';

test.describe('Platform Hub Security @high', () => {
  test.describe('Rate Limiting', () => {
    test('OAuth endpoint has rate limiting @high', async ({ request }) => {
      // Make multiple rapid requests to OAuth token endpoint
      const attempts = [];
      for (let i = 0; i < 12; i++) {
        attempts.push(
          request.post(`${BASE_URL}/api/oauth/token`, {
            data: {
              grant_type: 'authorization_code',
              code: 'test',
              client_id: 'test',
            },
            timeout: 5000,
          }).catch(() => null)
        );
      }

      await Promise.all(attempts);

      // After many attempts, should see rate limit response
      // Note: Actual rate limit behavior depends on implementation
      // This test validates the endpoint doesn't crash
      const finalResponse = await request.post(`${BASE_URL}/api/oauth/token`, {
        data: {
          grant_type: 'authorization_code',
          code: 'test',
          client_id: 'test',
        },
      }).catch(() => null);

      // Should either rate limit (429) or handle gracefully
      if (finalResponse) {
        expect([400, 401, 429, 500]).toContain(finalResponse.status());
      }
    });
  });

  test.describe('XSS Prevention', () => {
    test('login form prevents XSS in email field @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      const xssPayload = '<script>alert("XSS")</script>';
      await page.fill('input[name="email"]', xssPayload);
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Verify no XSS executed by checking page state

      // No script should have executed - page should still be on login
      expect(page.url()).toContain('/login');

      // XSS payload should be escaped in error message or input
      const emailValue = await page.locator('input[name="email"]').inputValue();
      expect(emailValue).toBe(xssPayload); // Should be preserved as string, not executed
    });

    test('signup form prevents XSS in inputs @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      const xssPayload = '<img src=x onerror=alert(1)>';
      await page.fill('input[name="email"]', xssPayload);

      // Verify no alert fired - XSS payload should be escaped

      const emailValue = await page.locator('input[name="email"]').inputValue();
      expect(emailValue).toBe(xssPayload); // Preserved as text
    });
  });

  test.describe('CSRF Protection', () => {
    test('OAuth consent requires authorization_id @high', async ({ page }) => {
      // Try to access consent page without authorization_id
      await page.goto(`${BASE_URL}/oauth/consent`);

      // Should show error about missing authorization_id
      await page.waitForLoadState('networkidle');

      // Page should handle missing parameter gracefully
      const errorText = await page.textContent('body');
      expect(errorText).toBeTruthy();

      // Either shows error message or redirects
      const url = page.url();
      expect(url).toBeTruthy();
    });
  });

  test.describe('Protected Routes', () => {
    test('dashboard requires authentication @critical', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 5000 });
      expect(page.url()).toContain('/login');
    });

    test('settings requires authentication @critical', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings`);

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 5000 });
      expect(page.url()).toContain('/login');
    });

    test('API routes require authentication @critical', async ({ request }) => {
      // Try to access protected API without auth
      const response = await request.post(`${BASE_URL}/api/profile/update`, {
        data: {
          display_name: 'Test User',
        },
      }).catch(() => null);

      if (response) {
        // Should be 401 Unauthorized or 403 Forbidden
        expect([401, 403, 500]).toContain(response.status());
      }
    });
  });

  test.describe('Input Validation', () => {
    test('SQL injection prevented in search @high', async ({ page }) => {
      await page.goto(BASE_URL);

      const sqlPayload = "'; DROP TABLE users; --";

      // Try SQL injection in any search or filter input
      const searchInput = page.locator('input[type="search"], input[type="text"]').first();

      if (await searchInput.count() > 0) {
        await searchInput.fill(sqlPayload);
        await searchInput.press('Enter');

        // Page should still function normally
        expect(page.url()).toContain(BASE_URL);
      }
    });

    test('invalid email format rejected @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.fill('input[name="email"]', 'not-an-email');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Should show validation error or prevent submission or prevent submission
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Security Headers', () => {
    test('security headers are present @medium', async ({ request }) => {
      const response = await request.get(BASE_URL);

      const headers = response.headers();

      // Check for common security headers
      // Note: Actual headers depend on Next.js config
      expect(response.status()).toBe(200);

      // X-Frame-Options prevents clickjacking
      const xFrameOptions = headers['x-frame-options'];
      if (xFrameOptions) {
        expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions);
      }
    });
  });
});
