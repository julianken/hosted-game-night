/**
 * Platform Hub Logout E2E Tests (BEA-521)
 *
 * Tests the complete logout flow:
 * 1. Login via auth fixture (authenticatedPage)
 * 2. Verify authenticated state on dashboard
 * 3. Click logout button
 * 4. Verify cookies are cleared
 * 5. Verify redirect to home page
 * 6. Verify protected routes redirect back to login
 */

import { test, expect } from '../fixtures/auth';
import { portConfig } from '../../playwright.config';

// Dynamic URL based on port configuration (supports worktree isolation)
const HUB_URL = `http://localhost:${portConfig.hubPort}`;

test.describe('Platform Hub Logout @critical', () => {
  test('authenticated user can log out successfully', async ({
    authenticatedPage,
  }) => {
    // Navigate to dashboard - user is already authenticated via fixture
    await authenticatedPage.goto(`${HUB_URL}/dashboard`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify authenticated state - welcome heading visible
    await expect(
      authenticatedPage.getByRole('heading', {
        name: /good (morning|afternoon|evening)/i,
        level: 1,
      })
    ).toBeVisible();

    // Verify logout button is visible
    const logoutButton = authenticatedPage.locator(
      '[data-testid="logout-button"]'
    );
    await expect(logoutButton).toBeVisible();

    // Click logout
    await logoutButton.click();

    // Verify redirect to home page (/) after logout
    await authenticatedPage.waitForURL(`${HUB_URL}/`, { timeout: 10000 });
    expect(authenticatedPage.url()).toBe(`${HUB_URL}/`);
  });

  test('cookies are cleared after logout', async ({ authenticatedPage }) => {
    // Navigate to dashboard
    await authenticatedPage.goto(`${HUB_URL}/dashboard`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify auth cookies exist before logout
    await expect(async () => {
      const cookiesBefore = await authenticatedPage.context().cookies();
      const hasAccessToken = cookiesBefore.some(
        (c) => c.name === 'beak_access_token' && c.value !== ''
      );
      expect(hasAccessToken).toBe(true);
    }).toPass({ timeout: 5000 });

    // Click logout
    const logoutButton = authenticatedPage.locator(
      '[data-testid="logout-button"]'
    );
    await logoutButton.click();

    // Wait for redirect to complete
    await authenticatedPage.waitForURL(`${HUB_URL}/`, { timeout: 10000 });

    // Verify auth cookies are cleared (empty value or absent)
    await expect(async () => {
      const cookiesAfter = await authenticatedPage.context().cookies();
      const accessToken = cookiesAfter.find(
        (c) => c.name === 'beak_access_token'
      );
      // Cookie should either be absent or have empty value (maxAge=0 clears it)
      if (accessToken) {
        expect(accessToken.value).toBe('');
      }
    }).toPass({ timeout: 5000 });
  });

  test('protected routes redirect to login after logout', async ({
    authenticatedPage,
  }) => {
    // Navigate to dashboard
    await authenticatedPage.goto(`${HUB_URL}/dashboard`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Click logout
    const logoutButton = authenticatedPage.locator(
      '[data-testid="logout-button"]'
    );
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Wait for redirect to home page
    await authenticatedPage.waitForURL(`${HUB_URL}/`, { timeout: 10000 });

    // Try accessing protected route (dashboard) after logout
    await authenticatedPage.goto(`${HUB_URL}/dashboard`);

    // Should be redirected to login page
    await expect(authenticatedPage).toHaveURL(/\/login/, { timeout: 10000 });

    // Verify login page is shown
    await expect(
      authenticatedPage
        .getByRole('heading', { name: /welcome back/i, level: 1 })
    ).toBeVisible();
  });

  test('settings page redirects to login after logout', async ({
    authenticatedPage,
  }) => {
    // Navigate to dashboard
    await authenticatedPage.goto(`${HUB_URL}/dashboard`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Click logout
    const logoutButton = authenticatedPage.locator(
      '[data-testid="logout-button"]'
    );
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Wait for redirect to home page
    await authenticatedPage.waitForURL(`${HUB_URL}/`, { timeout: 10000 });

    // Try accessing settings (another protected route) after logout
    await authenticatedPage.goto(`${HUB_URL}/settings`);

    // Should be redirected to login page
    await expect(authenticatedPage).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('sign in button appears on home page after logout', async ({
    authenticatedPage,
  }) => {
    // Navigate to dashboard
    await authenticatedPage.goto(`${HUB_URL}/dashboard`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Click logout
    const logoutButton = authenticatedPage.locator(
      '[data-testid="logout-button"]'
    );
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Wait for redirect to home page
    await authenticatedPage.waitForURL(`${HUB_URL}/`, { timeout: 10000 });

    // After logout, the Sign In button should be visible (not Sign Out)
    const signInButton = authenticatedPage.locator(
      '[data-testid="sign-in-button"]'
    );
    await expect(signInButton).toBeVisible({ timeout: 5000 });

    // Logout button should no longer be visible
    const logoutButtonAfter = authenticatedPage.locator(
      '[data-testid="logout-button"]'
    );
    await expect(logoutButtonAfter).not.toBeVisible();
  });
});
