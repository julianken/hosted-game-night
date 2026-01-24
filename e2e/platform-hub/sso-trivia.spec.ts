import { test, expect } from '@playwright/test';

/**
 * Cross-App SSO E2E Tests: Trivia → Platform Hub OAuth Flow
 *
 * Tests cover the complete OAuth 2.1 flow from Trivia app to Platform Hub:
 * - Redirect to Platform Hub authorization
 * - User login (if not authenticated)
 * - OAuth consent page
 * - Authorization code callback
 * - Token exchange
 * - Session establishment
 * - PKCE validation
 * - CSRF protection (state parameter)
 *
 * Tags:
 * @critical - Core OAuth flow that must work (SSO-012, SSO-013, SSO-016, SSO-017)
 * @high - Important security/UX features (SSO-014, SSO-015, SSO-018, SSO-021, SSO-022)
 * @medium - Error handling and edge cases (SSO-019, SSO-020)
 *
 * IMPORTANT: Most tests are skipped because they require real server-side OAuth token exchange
 * and authenticated session handling which cannot be fully mocked at the browser level with MSW.
 * These tests should be run against a real Platform Hub OAuth server instance.
 */

const TRIVIA_URL = 'http://localhost:3001';
const HUB_URL = 'http://localhost:3002';

/**
 * Generate unique test user email
 */
function generateTestEmail(): string {
  return `e2e-sso-trivia+${Date.now()}@beak-gaming.test`;
}

test.describe('Trivia → Platform Hub SSO', () => {
  test.describe('@critical OAuth Authorization Flow', () => {
    // SKIPPED: Requires OAuth flow initiation from Trivia app and real redirect handling
    test.skip('unauthenticated user redirected to Platform Hub login (SSO-012)', async ({ page }) => {
      // Start at Trivia home page
      await page.goto(TRIVIA_URL);

      // Click OAuth login button
      await page.click('button:has-text("Sign in with Beak Gaming")');

      // Should redirect to Platform Hub authorization endpoint
      await page.waitForURL(/localhost:3002/, { timeout: 10000 });

      // Should then redirect to login page (not authenticated)
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      // Should have redirect query parameter pointing back to OAuth consent
      await expect(page).toHaveURL(/redirect=%2Foauth%2Fconsent/);
    });

    // SKIPPED: Requires complete OAuth flow with token exchange and authenticated session
    test.skip('can complete OAuth flow from Trivia to Platform Hub (SSO-013)', async ({ page }) => {
      // Start at Trivia home page
      await page.goto(TRIVIA_URL);

      // Click OAuth login button
      await page.click('button:has-text("Sign in with Beak Gaming")');

      // Wait for redirect to Platform Hub
      await page.waitForURL(/localhost:3002/, { timeout: 10000 });

      // Should be on login page
      await expect(page).toHaveURL(/\/login/);

      // Create test user and login
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // First, signup
      await page.goto(`${HUB_URL}/signup`);
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Now restart OAuth flow
      await page.goto(TRIVIA_URL);
      await page.click('button:has-text("Sign in with Beak Gaming")');
      await page.waitForURL(/localhost:3002/, { timeout: 10000 });

      // Login
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      // Should redirect to OAuth consent page
      await expect(page).toHaveURL(/\/oauth\/consent/, { timeout: 10000 });
      await expect(page).toHaveURL(/authorization_id=/);

      // Approve consent
      await page.click('button[aria-label="Allow access"]');

      // Should redirect back to Trivia callback
      await expect(page).toHaveURL(new RegExp(`${TRIVIA_URL}/auth/callback`), { timeout: 10000 });

      // Should have authorization code in URL
      await expect(page).toHaveURL(/code=/);
      await expect(page).toHaveURL(/state=/);

      // Wait for callback handler to complete and redirect to Trivia home
      await expect(page).toHaveURL(TRIVIA_URL, { timeout: 10000 });

      // Verify successful authentication - user should see authenticated state
      await expect(page.locator('text=Completing Sign In')).not.toBeVisible();
    });

    // SKIPPED: Requires OAuth consent approval and token exchange to establish authenticated session
    test.skip('can approve OAuth consent and gain access to Trivia (SSO-016)', async ({ page }) => {
      // Create and login test user
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${HUB_URL}/signup`);
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Login to Platform Hub first
      await page.goto(`${HUB_URL}/login`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(`${HUB_URL}/dashboard`, { timeout: 10000 });

      // Now start OAuth flow from Trivia
      await page.goto(TRIVIA_URL);
      await page.click('button:has-text("Sign in with Beak Gaming")');

      // Should go directly to consent page (already authenticated)
      await expect(page).toHaveURL(/\/oauth\/consent/, { timeout: 10000 });
      await expect(page).toHaveURL(/authorization_id=/);

      // Verify consent page shows correct information
      await expect(page.locator('h1:has-text("Authorize Access")')).toBeVisible();
      await expect(page.locator(`text=${email}`)).toBeVisible();

      // Approve consent
      await page.click('button[aria-label="Allow access"]');

      // Should redirect back to Trivia with authorization code
      await expect(page).toHaveURL(new RegExp(`${TRIVIA_URL}/auth/callback`), { timeout: 10000 });
      await expect(page).toHaveURL(/code=/);

      // Wait for token exchange and redirect to Trivia home
      await expect(page).toHaveURL(TRIVIA_URL, { timeout: 10000 });

      // Verify authentication successful
      await expect(page.locator('text=Completing Sign In')).not.toBeVisible();
    });

    // SKIPPED: Requires real server-side session that persists across page reloads
    test.skip('session persists after OAuth flow completes (SSO-017)', async ({ page }) => {
      // Complete OAuth flow first
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${HUB_URL}/signup`);
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Start OAuth flow
      await page.goto(TRIVIA_URL);
      await page.click('button:has-text("Sign in with Beak Gaming")');
      await page.waitForURL(/localhost:3002/, { timeout: 10000 });

      // Login
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      // Approve consent
      await expect(page).toHaveURL(/\/oauth\/consent/, { timeout: 10000 });
      await page.click('button[aria-label="Allow access"]');

      // Wait for OAuth flow to complete
      await expect(page).toHaveURL(TRIVIA_URL, { timeout: 10000 });

      // Refresh the page
      await page.reload();

      // Session should persist - user should still be authenticated
      await expect(page).toHaveURL(TRIVIA_URL);
    });
  });

  test.describe('@high OAuth Consent and Callbacks', () => {
    // SKIPPED: Requires authenticated Platform Hub session to reach consent page
    test.skip('OAuth consent page displays correct app info (SSO-014)', async ({ page }) => {
      // Create and login test user
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${HUB_URL}/signup`);
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Login
      await page.goto(`${HUB_URL}/login`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(`${HUB_URL}/dashboard`, { timeout: 10000 });

      // Start OAuth flow
      await page.goto(TRIVIA_URL);
      await page.click('button:has-text("Sign in with Beak Gaming")');

      // Should show consent page
      await expect(page).toHaveURL(/\/oauth\/consent/, { timeout: 10000 });

      // Verify consent page elements
      await expect(page.locator('h1:has-text("Authorize Access")')).toBeVisible();
      await expect(page.locator('text=Beak Trivia')).toBeVisible(); // Client name
      await expect(page.locator(`text=${email}`)).toBeVisible(); // User email
      await expect(page.locator('text=wants to access your Beak Gaming account')).toBeVisible();

      // Verify buttons present
      await expect(page.locator('button[aria-label="Allow access"]')).toBeVisible();
      await expect(page.locator('button[aria-label="Deny access"]')).toBeVisible();

      // Verify scopes list
      await expect(page.locator('text=openid')).toBeVisible();
    });

    // SKIPPED: Requires OAuth flow and consent page interaction with real server handling
    test.skip('can deny OAuth consent and return to Trivia (SSO-015)', async ({ page }) => {
      // Create and login test user
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${HUB_URL}/signup`);
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Login
      await page.goto(`${HUB_URL}/login`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(`${HUB_URL}/dashboard`, { timeout: 10000 });

      // Start OAuth flow
      await page.goto(TRIVIA_URL);
      await page.click('button:has-text("Sign in with Beak Gaming")');
      await expect(page).toHaveURL(/\/oauth\/consent/, { timeout: 10000 });

      // Deny consent
      await page.click('button[aria-label="Deny access"]');

      // Should redirect back to Trivia with error
      await expect(page).toHaveURL(new RegExp(TRIVIA_URL), { timeout: 10000 });
      await expect(page).toHaveURL(/error=access_denied/);

      // Verify error is displayed
      await expect(page.locator('text=Authentication Error')).toBeVisible({ timeout: 5000 });
    });

    // SKIPPED: Requires OAuth callback with real authorization code and token exchange
    test.skip('OAuth callback handles authorization code correctly (SSO-018)', async ({ page }) => {
      // Complete OAuth flow
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${HUB_URL}/signup`);
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Start OAuth flow
      await page.goto(TRIVIA_URL);
      await page.click('button:has-text("Sign in with Beak Gaming")');
      await page.waitForURL(/localhost:3002/, { timeout: 10000 });

      // Login
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      // Approve consent
      await expect(page).toHaveURL(/\/oauth\/consent/, { timeout: 10000 });
      await page.click('button[aria-label="Allow access"]');

      // Wait for redirect to callback
      await expect(page).toHaveURL(new RegExp(`${TRIVIA_URL}/auth/callback`), { timeout: 10000 });

      // Verify callback URL has required parameters
      const url = page.url();
      expect(url).toContain('code=');
      expect(url).toContain('state=');

      // Verify callback handler processes successfully (redirects to home)
      await expect(page).toHaveURL(TRIVIA_URL, { timeout: 10000 });

      // Should not show error
      await expect(page.locator('text=Authentication Error')).not.toBeVisible();
    });

    // SKIPPED: PKCE validation happens server-side during token exchange
    test.skip('PKCE code verifier validation works (SSO-021)', async ({ page }) => {
      // This test verifies PKCE by checking that the flow completes successfully
      // The server validates code_challenge on authorization and code_verifier on token exchange

      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${HUB_URL}/signup`);
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Start OAuth flow (client generates code_challenge)
      await page.goto(TRIVIA_URL);
      await page.click('button:has-text("Sign in with Beak Gaming")');
      await page.waitForURL(/localhost:3002/, { timeout: 10000 });

      // The authorization URL should include code_challenge
      // (verified by server accepting the request)

      // Login and approve
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/oauth\/consent/, { timeout: 10000 });
      await page.click('button[aria-label="Allow access"]');

      // Callback exchanges code with code_verifier (PKCE validation happens server-side)
      await expect(page).toHaveURL(new RegExp(`${TRIVIA_URL}/auth/callback`), { timeout: 10000 });

      // If PKCE validation succeeds, we redirect to home
      await expect(page).toHaveURL(TRIVIA_URL, { timeout: 10000 });

      // If PKCE failed, we'd see an error
      await expect(page.locator('text=Authentication Error')).not.toBeVisible();
    });

    // SKIPPED: State parameter validation requires complete OAuth flow with server-side validation
    test.skip('OAuth state parameter prevents CSRF (SSO-022)', async ({ page }) => {
      // This test verifies CSRF protection via state parameter
      // The client generates a random state, stores it, and validates it on callback

      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${HUB_URL}/signup`);
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Start OAuth flow (client generates state parameter)
      await page.goto(TRIVIA_URL);
      await page.click('button:has-text("Sign in with Beak Gaming")');
      await page.waitForURL(/localhost:3002/, { timeout: 10000 });

      // Login and approve
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/oauth\/consent/, { timeout: 10000 });
      await page.click('button[aria-label="Allow access"]');

      // Callback validates state parameter matches stored value
      await expect(page).toHaveURL(new RegExp(`${TRIVIA_URL}/auth/callback`), { timeout: 10000 });

      // Verify state parameter is present in callback URL
      const url = page.url();
      expect(url).toContain('state=');

      // If state validation succeeds, we redirect to home
      await expect(page).toHaveURL(TRIVIA_URL, { timeout: 10000 });

      // If state validation failed, we'd see an error
      await expect(page.locator('text=Authentication Error')).not.toBeVisible();
    });
  });

  test.describe('@medium Error Handling', () => {
    // SKIPPED: Requires OAuth callback handler and token exchange attempt with invalid code
    test.skip('invalid authorization code shows error (SSO-019)', async ({ page }) => {
      // Manually navigate to callback with invalid code
      await page.goto(`${TRIVIA_URL}/auth/callback?code=invalid_code_12345&state=test_state`);

      // Should show error message
      await expect(page.locator('text=Authentication Error')).toBeVisible({ timeout: 5000 });

      // Should redirect to home after delay
      await expect(page).toHaveURL(TRIVIA_URL, { timeout: 5000 });
    });

    // SKIPPED: Requires OAuth callback handler with expired code detection
    test.skip('expired authorization code shows error (SSO-020)', async ({ page }) => {
      // This test would require a real expired code from Platform Hub
      // For now, we test the error handling path by providing an invalid code
      // (In a real scenario, this would use a code that's genuinely expired)

      await page.goto(`${TRIVIA_URL}/auth/callback?code=expired_code&state=test_state`);

      // Should show error
      await expect(page.locator('text=Authentication Error')).toBeVisible({ timeout: 5000 });

      // Should redirect to home
      await expect(page).toHaveURL(TRIVIA_URL, { timeout: 5000 });
    });
  });
});
