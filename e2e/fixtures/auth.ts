import { test as base, type Page } from '@playwright/test';

// URL Constants
const HUB_URL = 'http://localhost:3002';
const BINGO_URL = 'http://localhost:3000';
const TRIVIA_URL = 'http://localhost:3001';

// Timeout Constants
const AUTH_TIMEOUT_MS = 10000; // OAuth login can be slow in CI

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
   * By default, dismisses the Room Setup modal automatically.
   */
  authenticatedBingoPage: Page;

  /**
   * Pre-authenticated page for Trivia app.
   * Logs in via Platform Hub, then navigates to Trivia with SSO cookies.
   * By default, dismisses the Room Setup modal automatically.
   */
  authenticatedTriviaPage: Page;

  /**
   * Skip automatic Room Setup modal dismissal.
   * Use this when testing the modal itself.
   */
  skipModalDismissal: boolean;
}

/**
 * Helper function to login via Platform Hub and verify SSO cookies.
 * Used by game app fixtures (Bingo, Trivia) for cross-app authentication.
 *
 * @param page - Playwright page instance
 * @param testUser - Test user credentials
 * @throws Error if OAuth login fails (missing beak_access_token cookie)
 */
async function loginViaPlatformHub(page: Page, testUser: TestUser): Promise<void> {
  await page.goto(`${HUB_URL}/login`);
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${HUB_URL}/dashboard`, { timeout: AUTH_TIMEOUT_MS });

  // Verify SSO cookies exist
  const cookies = await page.context().cookies();
  if (!cookies.some((c) => c.name === 'beak_access_token')) {
    throw new Error('OAuth login failed: beak_access_token cookie not set');
  }
}

/**
 * Helper function to dismiss the Room Setup modal on Bingo/Trivia /play pages.
 * The modal auto-opens when the user is authenticated but has no active session.
 * This helper clicks "Play Offline" to create an offline session and dismiss the modal.
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait for modal (default: 5000ms)
 */
async function dismissRoomSetupModal(page: Page, timeout = 5000): Promise<void> {
  try {
    // Wait for the modal to appear (with timeout)
    const modal = page.getByRole('dialog');
    await modal.waitFor({ state: 'visible', timeout });

    // Click "Play Offline" button within the modal
    const playOfflineButton = modal.getByRole('button', { name: /play offline/i });
    await playOfflineButton.click();

    // Wait for modal to close
    await modal.waitFor({ state: 'hidden', timeout });
  } catch (error) {
    // If modal doesn't appear within timeout, that's fine - user might already have a session
    // Only throw if the error is NOT a timeout
    if (error instanceof Error && !error.message.includes('Timeout')) {
      throw error;
    }
  }
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
   * Skip automatic Room Setup modal dismissal.
   * Defaults to false (modal IS dismissed automatically).
   * Set to true in tests that need to test the modal itself.
   */
  skipModalDismissal: async ({}, use) => {
    await use(false);
  },

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
    await page.goto(`${HUB_URL}/login?redirect=/dashboard`);

    // Fill in credentials
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard (indicates successful login)
    await page.waitForURL(`${HUB_URL}/dashboard`, {
      timeout: AUTH_TIMEOUT_MS,
    });

    // Store auth state for potential reuse
    await page.context().storageState({ path: '.auth/user.json' });

    // Provide authenticated page to test
    await use(page);

    // Cleanup: logout after test
    const logoutButton = page.locator('[data-testid="logout-button"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForURL(`${HUB_URL}/`, { timeout: 5000 });
    }
  },

  /**
   * Authenticated Bingo page fixture.
   * Logs in via Platform Hub OAuth, then navigates to Bingo /play.
   * Automatically dismisses Room Setup modal unless skipModalDismissal is true.
   */
  authenticatedBingoPage: async ({ page, testUser, skipModalDismissal }, use) => {
    // 1. Login via Platform Hub to get SSO cookies
    await loginViaPlatformHub(page, testUser);

    // 2. Navigate to Bingo /play with SSO cookies
    await page.goto(`${BINGO_URL}/play`);

    // 3. Dismiss Room Setup modal (unless test opts out)
    if (!skipModalDismissal) {
      await dismissRoomSetupModal(page);
    }

    // Provide authenticated Bingo page to test
    await use(page);

    // No logout needed - SSO cookies are session-scoped
  },

  /**
   * Authenticated Trivia page fixture.
   * Logs in via Platform Hub OAuth, then navigates to Trivia /play.
   * Automatically dismisses Room Setup modal unless skipModalDismissal is true.
   */
  authenticatedTriviaPage: async ({ page, testUser, skipModalDismissal }, use) => {
    // 1. Login via Platform Hub to get SSO cookies
    await loginViaPlatformHub(page, testUser);

    // 2. Navigate to Trivia /play with SSO cookies
    await page.goto(`${TRIVIA_URL}/play`);

    // 3. Dismiss Room Setup modal (unless test opts out)
    if (!skipModalDismissal) {
      await dismissRoomSetupModal(page);
    }

    // Provide authenticated Trivia page to test
    await use(page);

    // No logout needed - SSO cookies are session-scoped
  },
});

export { expect } from '@playwright/test';
