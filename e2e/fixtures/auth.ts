import { test as base, type Page } from '@playwright/test';

/**
 * Test user credentials for E2E authentication tests.
 * This user should be created in the test database setup.
 */
export interface TestUser {
  email: string;
  password: string;
}

/**
 * Authentication fixtures for E2E tests.
 * Provides reusable auth state and authenticated page context.
 */
export interface AuthFixtures {
  /**
   * Test user credentials.
   * Default test user for authentication flows.
   */
  testUser: TestUser;

  /**
   * Pre-authenticated page fixture.
   * Automatically logs in the test user before each test.
   */
  authenticatedPage: Page;
}

/**
 * Game app authentication fixtures.
 * Pre-authenticated page contexts for Bingo and Trivia apps.
 */
export interface GameAuthFixtures {
  /**
   * Pre-authenticated page for Bingo app.
   * Logs in via Platform Hub, then navigates to Bingo with SSO cookies.
   */
  authenticatedBingoPage: Page;

  /**
   * Pre-authenticated page for Trivia app.
   * Logs in via Platform Hub, then navigates to Trivia with SSO cookies.
   */
  authenticatedTriviaPage: Page;
}

/**
 * Extended test with authentication fixtures.
 *
 * Usage:
 * ```typescript
 * import { test } from './fixtures/auth';
 *
 * test('shows dashboard for authenticated user', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/dashboard');
 *   // User is already logged in
 * });
 * ```
 */
export const test = base.extend<AuthFixtures & GameAuthFixtures>({
  /**
   * Default test user credentials.
   * Override in individual tests if needed.
   */
  testUser: async ({}, use) => {
    await use({
      email: process.env.TEST_USER_EMAIL || 'e2e-test@beak-gaming.test',
      password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    });
  },

  /**
   * Authenticated page fixture.
   * Logs in via UI and stores auth state for reuse.
   */
  authenticatedPage: async ({ page, testUser }, use) => {
    // Navigate to login page with dashboard redirect
    await page.goto('http://localhost:3002/login?redirect=/dashboard');

    // Fill in credentials
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard (indicates successful login)
    await page.waitForURL('http://localhost:3002/dashboard', {
      timeout: 10000,
    });

    // Store auth state for potential reuse
    await page.context().storageState({ path: '.auth/user.json' });

    // Provide authenticated page to test
    await use(page);

    // Cleanup: logout after test
    const logoutButton = page.locator('[data-testid="logout-button"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForURL('http://localhost:3002/', { timeout: 5000 });
    }
  },

  /**
   * Authenticated Bingo page fixture.
   * Logs in via Platform Hub OAuth, then navigates to Bingo /play.
   */
  authenticatedBingoPage: async ({ page, testUser }, use) => {
    // 1. Login via Platform Hub to get SSO cookies
    await page.goto('http://localhost:3002/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for successful login (redirects to dashboard)
    await page.waitForURL('http://localhost:3002/dashboard', {
      timeout: 10000,
    });

    // 2. Verify SSO cookies exist (cross-app cookies set by Platform Hub)
    const cookies = await page.context().cookies();
    const hasAccessToken = cookies.some((c) => c.name === 'beak_access_token');
    if (!hasAccessToken) {
      throw new Error('OAuth login failed: beak_access_token cookie not set');
    }

    // 3. Navigate to Bingo /play with SSO cookies
    await page.goto('http://localhost:3000/play');

    // Provide authenticated Bingo page to test
    await use(page);

    // No logout needed - SSO cookies are session-scoped
  },

  /**
   * Authenticated Trivia page fixture.
   * Logs in via Platform Hub OAuth, then navigates to Trivia /play.
   */
  authenticatedTriviaPage: async ({ page, testUser }, use) => {
    // 1. Login via Platform Hub to get SSO cookies
    await page.goto('http://localhost:3002/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for successful login (redirects to dashboard)
    await page.waitForURL('http://localhost:3002/dashboard', {
      timeout: 10000,
    });

    // 2. Verify SSO cookies exist
    const cookies = await page.context().cookies();
    const hasAccessToken = cookies.some((c) => c.name === 'beak_access_token');
    if (!hasAccessToken) {
      throw new Error('OAuth login failed: beak_access_token cookie not set');
    }

    // 3. Navigate to Trivia /play with SSO cookies
    await page.goto('http://localhost:3001/play');

    // Provide authenticated Trivia page to test
    await use(page);

    // No logout needed - SSO cookies are session-scoped
  },
});

export { expect } from '@playwright/test';
