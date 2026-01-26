import { test as base, expect as playwrightExpect, type Page } from '@playwright/test';
import { portConfig } from '../../playwright.config';

// -----------------------------------------------------------------------------
// Dynamic URL Constants for Worktree Isolation
// -----------------------------------------------------------------------------
// URLs are derived from the port configuration in playwright.config.ts.
// This enables parallel E2E testing across multiple git worktrees.
//
// Main repo: Uses default ports 3000, 3001, 3002
// Worktrees: Use hash-based port offsets derived from their path
// Environment variables can override: E2E_PORT_BASE, E2E_*_PORT
//
// See playwright.config.ts and e2e/utils/port-isolation.ts for details.
// -----------------------------------------------------------------------------

const HUB_URL = `http://localhost:${portConfig.hubPort}`;
const BINGO_URL = `http://localhost:${portConfig.bingoPort}`;
const TRIVIA_URL = `http://localhost:${portConfig.triviaPort}`;

// Timeout Constants
const AUTH_TIMEOUT_MS = 10000; // OAuth login can be slow in CI
const AUTH_RETRY_ATTEMPTS = 3; // Retry up to 3 times for rate limit errors
const AUTH_RETRY_DELAY_MS = 2000; // Base delay between retries (will use exponential backoff)
const AUTH_STAGGER_MAX_MS = 1000; // Max random delay to stagger parallel logins (0-1000ms)

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

  /**
   * Navigation timeout for game app pages in milliseconds.
   * Mobile viewports may need longer timeouts due to slower rendering
   * and potential auth redirect race conditions (BEA-375).
   * Default: 5000ms. Override in project config for mobile: 15000ms.
   */
  navigationTimeout: number;
}

/**
 * Helper function to sleep for a specified duration.
 * Used for retry delays when handling rate limits.
 *
 * @param ms - Milliseconds to sleep
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper function to check if page is showing a rate limit error.
 * Checks for common rate limit error messages on the page.
 *
 * @param page - Playwright page instance
 * @returns True if rate limit error is detected
 */
async function isRateLimitError(page: Page): Promise<boolean> {
  const bodyText = await page.textContent('body');
  if (!bodyText) return false;

  // Check for common rate limit error messages
  const rateLimitPatterns = [
    /rate limit/i,
    /too many requests/i,
    /try again later/i,
    /exceeded.*limit/i,
  ];

  return rateLimitPatterns.some((pattern) => pattern.test(bodyText));
}

/**
 * Options for loginViaPlatformHub function.
 */
interface LoginOptions {
  /** Target URL to copy SSO cookies to after login */
  targetUrl?: string;
  /** Navigation timeout in ms (default: 5000) */
  navigationTimeout?: number;
}

/**
 * Helper function to login via Platform Hub and verify SSO cookies.
 * Used by game app fixtures (Bingo, Trivia) for cross-app authentication.
 *
 * Includes retry logic to handle Supabase rate limiting during parallel test execution.
 * Supabase auth has limits of ~30 requests/hour per email or ~10 requests/hour per IP.
 * When multiple tests run in parallel, they can hit these limits.
 *
 * Strategy:
 * 1. Add random stagger delay (0-1000ms) BEFORE first attempt to spread parallel requests
 * 2. Retry up to 3 times with exponential backoff (2s, 4s, 8s)
 * 3. Detect rate limit errors quickly via page content check
 * 4. Copy SSO cookies to target domain (different ports = different origins)
 *
 * @param page - Playwright page instance
 * @param testUser - Test user credentials
 * @param options - Optional login options (targetUrl, navigationTimeout)
 * @throws Error if OAuth login fails after all retries
 */
async function loginViaPlatformHub(
  page: Page,
  testUser: TestUser,
  options: LoginOptions = {}
): Promise<void> {
  const { targetUrl, navigationTimeout = 5000 } = options;
  // Add random stagger delay BEFORE first attempt to prevent thundering herd
  // This spreads out parallel login requests across a 1-second window
  const staggerDelay = Math.random() * AUTH_STAGGER_MAX_MS;
  await sleep(staggerDelay);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= AUTH_RETRY_ATTEMPTS; attempt++) {
    try {
      // Navigate to login page
      await page.goto(`${HUB_URL}/login`);

      // Fill in credentials
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);

      // Submit login form
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard (indicates successful login)
      // Use a race condition to detect rate limit errors faster
      const dashboardPromise = page.waitForURL(`${HUB_URL}/dashboard`, {
        timeout: AUTH_TIMEOUT_MS,
      });

      // Also wait for potential rate limit error on the page
      const rateLimitCheckPromise = (async () => {
        await page.waitForTimeout(1000); // Wait 1s for error to appear
        // Only check if still on login page (avoids false positives on destination pages)
        if (page.url().includes('/login') && (await isRateLimitError(page))) {
          throw new Error('Rate limit error detected on login page');
        }
      })();

      // Race: either we redirect to dashboard OR we detect a rate limit error
      await Promise.race([dashboardPromise, rateLimitCheckPromise]);

      // If we get here, we successfully navigated to dashboard
      // Wait for SSO cookie with polling (cookie storage is async)
      // Using expect.toPass() for automatic retry with exponential backoff
      await playwrightExpect(async () => {
        const cookies = await page.context().cookies();
        const hasToken = cookies.some((c) => c.name === 'beak_access_token');
        playwrightExpect(hasToken).toBe(true);
      }).toPass({
        timeout: navigationTimeout,
        intervals: [100, 250, 500, 1000], // Exponential backoff polling
      });

      // Copy SSO cookies to target domain if specified
      // (different ports = different origins, cookies don't propagate automatically)
      if (targetUrl) {
        await copySSOCookiesToDomain(page, targetUrl);
      }

      // Success! Exit the retry loop
      return;
    } catch (error) {
      lastError = error as Error;

      // Check if this is a rate limit error or a retryable error
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Only check page content for rate limit errors if still on login page
      // After successful navigation to /play, "try again" text on game error pages
      // causes false positive rate limit detection
      const isRetryable =
        errorMessage.includes('rate limit') ||
        errorMessage.includes('Rate limit') ||
        errorMessage.includes('Too many requests') ||
        errorMessage.includes('Timeout') ||
        (page.url().includes('/login') && (await isRateLimitError(page)));

      if (!isRetryable || attempt === AUTH_RETRY_ATTEMPTS) {
        // Non-retryable error or final attempt - rethrow
        throw error;
      }

      // Exponential backoff: 2s, 4s, 8s
      const retryDelay = AUTH_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(
        `[Auth Fixture] Login attempt ${attempt}/${AUTH_RETRY_ATTEMPTS} failed (rate limit). ` +
          `Retrying in ${retryDelay}ms...`
      );
      await sleep(retryDelay);
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('Login failed after all retries');
}

/**
 * Helper function to copy SSO cookies from Platform Hub to a target domain.
 * Browsers treat different ports as different origins, so cookies set on
 * localhost:3002 don't automatically apply to localhost:3000.
 *
 * @param page - Playwright page instance
 * @param targetUrl - The target URL to copy cookies to (e.g., 'http://localhost:3000')
 */
async function copySSOCookiesToDomain(page: Page, targetUrl: string): Promise<void> {
  const cookies = await page.context().cookies();
  const ssoCookies = cookies.filter((c) =>
    ['beak_access_token', 'beak_refresh_token', 'beak_user_id'].includes(c.name)
  );

  if (ssoCookies.length > 0) {
    // Add cookies to target domain using url property (not domain)
    await page.context().addCookies(
      ssoCookies.map((c) => ({
        name: c.name,
        value: c.value,
        url: targetUrl,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
        expires: c.expires,
      }))
    );
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
  const modal = page.getByRole('dialog', { name: /room setup/i });

  // First, check if modal appears - if not, user might already have a session
  try {
    await modal.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    // Modal didn't appear - that's fine, user might already have an active session
    return;
  }

  // Modal is visible - we need to dismiss it
  // Wait for modal content to be fully rendered and click Play Offline
  // Use the button's aria-label for precise selection
  const playOfflineButton = modal.getByRole('button', {
    name: 'Play offline without network connection',
  });
  await playOfflineButton.waitFor({ state: 'visible', timeout: 2000 });

  // Click "Play Offline" button
  await playOfflineButton.click();

  // Wait for modal to close with generous timeout for animation
  await modal.waitFor({ state: 'hidden', timeout });
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
  skipModalDismissal: [false, { option: true }],

  /**
   * Navigation timeout for game app pages.
   * Mobile viewports may need longer timeouts due to slower rendering
   * and potential auth redirect race conditions (BEA-375).
   * Default: 5000ms. Override in project config for mobile: 15000ms.
   */
  navigationTimeout: [5000, { option: true }],

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
   * Includes retry logic to handle Supabase rate limiting with staggered delays.
   */
  authenticatedPage: async ({ page, testUser }, use) => {
    // Add random stagger delay BEFORE first attempt to prevent thundering herd
    const staggerDelay = Math.random() * AUTH_STAGGER_MAX_MS;
    await sleep(staggerDelay);

    // Retry login if rate limited
    for (let attempt = 1; attempt <= AUTH_RETRY_ATTEMPTS; attempt++) {
      try {
        // Navigate to login page with dashboard redirect
        await page.goto(`${HUB_URL}/login?redirect=/dashboard`);

        // Fill in credentials
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);

        // Submit login form
        await page.click('button[type="submit"]');

        // Wait for redirect to dashboard (indicates successful login)
        const dashboardPromise = page.waitForURL(`${HUB_URL}/dashboard`, {
          timeout: AUTH_TIMEOUT_MS,
        });

        // Also check for rate limit errors
        const rateLimitCheckPromise = (async () => {
          await page.waitForTimeout(1000);
          // Only check if still on login page (avoids false positives on destination pages)
          if (page.url().includes('/login') && (await isRateLimitError(page))) {
            throw new Error('Rate limit error detected on login page');
          }
        })();

        await Promise.race([dashboardPromise, rateLimitCheckPromise]);

        // Success! Store auth state and break out of retry loop
        await page.context().storageState({ path: '.auth/user.json' });
        break;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Only check page content for rate limit errors if still on login page
        // After successful navigation to /dashboard, "try again" text on other pages
        // causes false positive rate limit detection
        const isRetryable =
          errorMessage.includes('rate limit') ||
          errorMessage.includes('Rate limit') ||
          errorMessage.includes('Too many requests') ||
          errorMessage.includes('Timeout') ||
          (page.url().includes('/login') && (await isRateLimitError(page)));

        if (!isRetryable || attempt === AUTH_RETRY_ATTEMPTS) {
          throw error;
        }

        // Exponential backoff: 2s, 4s, 8s
        const retryDelay = AUTH_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(
          `[Auth Fixture] Login attempt ${attempt}/${AUTH_RETRY_ATTEMPTS} failed (rate limit). ` +
            `Retrying in ${retryDelay}ms...`
        );
        await sleep(retryDelay);
      }
    }

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
  authenticatedBingoPage: async ({ page, testUser, skipModalDismissal, navigationTimeout }, use) => {
    // 1. Login via Platform Hub to get SSO cookies
    // Copy cookies to Bingo domain (different ports = different origins)
    await loginViaPlatformHub(page, testUser, {
      targetUrl: BINGO_URL,
      navigationTimeout,
    });

    // 2. Navigate to Bingo /play with SSO cookies
    // Handle potential navigation interruption from middleware auth redirect
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto(`${BINGO_URL}/play`, {
          waitUntil: 'load',
          timeout: navigationTimeout,
        });

        // If we got redirected to login, wait and retry (auth race condition)
        if (page.url().includes('/login')) {
          // Wait for any in-flight redirects to settle
          await page.waitForTimeout(500);
          retries--;
          continue;
        }

        // Successfully on /play page
        break;
      } catch (error) {
        // Handle navigation interruption errors (middleware redirect race condition)
        if (
          error instanceof Error &&
          error.message.includes('Navigation') &&
          error.message.includes('interrupted')
        ) {
          // Wait for redirect to complete
          await page.waitForTimeout(1000);
          retries--;
          if (retries === 0) throw error;
          continue;
        }
        throw error;
      }
    }

    // 3. Dismiss Room Setup modal (unless test opts out)
    if (!skipModalDismissal) {
      await dismissRoomSetupModal(page, navigationTimeout);
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
  authenticatedTriviaPage: async ({ page, testUser, skipModalDismissal, navigationTimeout }, use) => {
    // 1. Login via Platform Hub to get SSO cookies
    // Copy cookies to Trivia domain (different ports = different origins)
    await loginViaPlatformHub(page, testUser, {
      targetUrl: TRIVIA_URL,
      navigationTimeout,
    });

    // 2. Navigate to Trivia /play with SSO cookies
    // Handle potential navigation interruption from middleware auth redirect
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto(`${TRIVIA_URL}/play`, {
          waitUntil: 'load',
          timeout: navigationTimeout,
        });

        // If we got redirected to login, wait and retry (auth race condition)
        if (page.url().includes('/login')) {
          // Wait for any in-flight redirects to settle
          await page.waitForTimeout(500);
          retries--;
          continue;
        }

        // Successfully on /play page
        break;
      } catch (error) {
        // Handle navigation interruption errors (middleware redirect race condition)
        if (
          error instanceof Error &&
          error.message.includes('Navigation') &&
          error.message.includes('interrupted')
        ) {
          // Wait for redirect to complete
          await page.waitForTimeout(1000);
          retries--;
          if (retries === 0) throw error;
          continue;
        }
        throw error;
      }
    }

    // 3. Dismiss Room Setup modal (unless test opts out)
    if (!skipModalDismissal) {
      await dismissRoomSetupModal(page, navigationTimeout);
    }

    // Provide authenticated Trivia page to test
    await use(page);

    // No logout needed - SSO cookies are session-scoped
  },
});

export { expect } from '@playwright/test';
