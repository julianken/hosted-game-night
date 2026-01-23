import { test, expect } from '@playwright/test';
import {
  setupSupabaseAuthMocks,
  resetMockAuthState,
} from '../mocks/supabase-auth-handlers';

/**
 * Platform Hub Authentication E2E Tests
 *
 * Tests cover:
 * - Login flows (valid/invalid credentials, form validation)
 * - Signup flows (validation, duplicate emails, success)
 * - Password reset flow (email request)
 * - Form validation
 *
 * Tags:
 * @critical - Must-work features (login, signup, validation)
 * @high - Important flows (password reset, validation details)
 * @medium - Secondary features (form validation details)
 *
 * Note: These tests use Playwright route interception to mock Supabase Auth API calls,
 * allowing them to run in CI without real Supabase credentials.
 *
 * IMPORTANT: Some tests (logout, session persistence, protected routes) are NOT included
 * because they require real server-side session handling which cannot be fully mocked
 * at the browser level. Those tests should be run against a real Supabase instance.
 */

const BASE_URL = 'http://localhost:3002';

/**
 * Generate unique email for each test run to avoid conflicts
 */
function generateTestEmail(): string {
  return `e2e-test+${Date.now()}@beak-gaming.test`;
}

test.describe('@critical Platform Hub Authentication', () => {
  // Set up Supabase Auth mocks before each test
  test.beforeEach(async ({ page }) => {
    // Reset mock state to ensure test isolation
    resetMockAuthState();
    // Set up route interception for Supabase Auth API
    await setupSupabaseAuthMocks(page);
  });

  test.describe('Login flows', () => {
    test('login page renders correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Check page title
      await expect(page).toHaveTitle(/Sign In/);

      // Check header (use first() due to potential SSR hydration duplicates)
      await expect(page.locator('h1').first()).toHaveText('Welcome Back');

      // Check form elements exist (use first() for each to handle hydration)
      await expect(page.locator('input[name="email"]').first()).toBeVisible();
      await expect(page.locator('input[name="password"]').first()).toBeVisible();
      await expect(page.locator('button[type="submit"]').first()).toBeVisible();

      // Check navigation links
      await expect(page.locator('a[href="/signup"]').first()).toBeVisible();
      await expect(page.locator('a[href="/forgot-password"]').first()).toBeVisible();
    });

    test('user can log in with valid credentials @critical', async ({ page }) => {
      // First, create a test account via signup
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      await page.goto(`${BASE_URL}/signup`);
      await page.locator('input[name="email"]').first().fill(email);
      await page.locator('input[name="password"]').first().fill(password);
      await page.locator('input[name="confirmPassword"]').first().fill(password);
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Wait for signup success message
      await expect(page.locator('text=Account Created!').first()).toBeVisible({ timeout: 10000 });

      // Note: MSW mock auto-confirms email, so login works immediately

      // Now attempt to login (default redirect is home page)
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="email"]').first().fill(email);
      await page.locator('input[name="password"]').first().fill(password);
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Should redirect after login (default is home page)
      await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 10000 });

      // Verify user is authenticated (logout button visible in navigation)
      await expect(page.locator('[data-testid="logout-button"]').first()).toBeVisible();
    });

    test('invalid login shows error message @critical', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Try to login with non-existent credentials
      await page.locator('input[name="email"]').first().fill('nonexistent@example.com');
      await page.locator('input[name="password"]').first().fill('wrongpassword');
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Should show error message (from mock auth - "Invalid login credentials")
      await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('empty form shows validation errors @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Click submit without filling form
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Should show validation errors
      await expect(page.locator('#email-error').first()).toBeVisible();
      await expect(page.locator('#password-error').first()).toBeVisible();
    });

    test('invalid email format shows error @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.locator('input[name="email"]').first().fill('invalid-email');
      await page.locator('input[name="password"]').first().fill('password123');
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Should show email validation error
      await expect(page.locator('#email-error').first()).toContainText('valid email');
    });

    test('password too short shows error @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.locator('input[name="email"]').first().fill('test@example.com');
      await page.locator('input[name="password"]').first().fill('12345'); // Less than 6 chars
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Should show password validation error
      await expect(page.locator('#password-error').first()).toContainText('at least 6 characters');
    });
  });

  test.describe('Signup flows', () => {
    test('signup page renders correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Check page title
      await expect(page).toHaveTitle(/Create Account/);

      // Check header
      await expect(page.locator('h1').first()).toHaveText('Create Account');

      // Check form elements exist
      await expect(page.locator('input[name="name"]').first()).toBeVisible();
      await expect(page.locator('input[name="email"]').first()).toBeVisible();
      await expect(page.locator('input[name="password"]').first()).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]').first()).toBeVisible();
      await expect(page.locator('button[type="submit"]').first()).toBeVisible();

      // Check password requirements text
      await expect(page.locator('text=At least 8 characters').first()).toBeVisible();

      // Check link to login
      await expect(page.locator('a[href="/login"]').first()).toBeVisible();
    });

    test('user can sign up with valid credentials @critical', async ({ page }) => {
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      await page.goto(`${BASE_URL}/signup`);

      // Fill signup form
      await page.locator('input[name="name"]').first().fill('Test User');
      await page.locator('input[name="email"]').first().fill(email);
      await page.locator('input[name="password"]').first().fill(password);
      await page.locator('input[name="confirmPassword"]').first().fill(password);
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Should show success message
      await expect(page.locator('text=Account Created!').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=check your email to verify').first()).toBeVisible();
    });

    test('signup empty form shows validation errors @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Wait for the form to be fully loaded and interactive
      await page.waitForLoadState('networkidle');
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.waitFor({ state: 'visible' });

      // Ensure button is not in loading state
      await expect(submitButton).not.toHaveAttribute('aria-busy', 'true');

      // Try to submit empty form
      await submitButton.click();

      // Should show validation errors for required fields
      await expect(page.locator('#email-error').first()).toBeVisible();
      await expect(page.locator('#password-error').first()).toBeVisible();
    });

    test('duplicate email shows error message @high', async ({ page }) => {
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // First signup
      await page.goto(`${BASE_URL}/signup`);
      await page.locator('input[name="email"]').first().fill(email);
      await page.locator('input[name="password"]').first().fill(password);
      await page.locator('input[name="confirmPassword"]').first().fill(password);
      await page.locator('button[type="submit"]').first().click({ force: true });
      await expect(page.locator('text=Account Created!').first()).toBeVisible({ timeout: 10000 });

      // Try to signup again with same email
      await page.goto(`${BASE_URL}/signup`);
      await page.locator('input[name="email"]').first().fill(email);
      await page.locator('input[name="password"]').first().fill(password);
      await page.locator('input[name="confirmPassword"]').first().fill(password);
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Should show error about duplicate email
      await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('email confirmation required message shown @high', async ({ page }) => {
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      await page.goto(`${BASE_URL}/signup`);
      await page.locator('input[name="email"]').first().fill(email);
      await page.locator('input[name="password"]').first().fill(password);
      await page.locator('input[name="confirmPassword"]').first().fill(password);
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Success message should mention email verification
      await expect(page.locator('text=Account Created!').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=check your email to verify').first()).toBeVisible();
    });

    test('signup form validates password requirements @medium', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Test password too short
      await page.locator('input[name="email"]').first().fill('test@example.com');
      await page.locator('input[name="password"]').first().fill('Test1'); // Less than 8 chars
      await page.locator('input[name="confirmPassword"]').first().fill('Test1');
      await page.locator('button[type="submit"]').first().click({ force: true });
      await expect(page.locator('#password-error').first()).toContainText('at least 8 characters');

      // Test password missing uppercase
      await page.locator('input[name="password"]').first().fill('testpassword1');
      await page.locator('input[name="confirmPassword"]').first().fill('testpassword1');
      await page.locator('button[type="submit"]').first().click({ force: true });
      await expect(page.locator('#password-error').first()).toContainText('uppercase');

      // Test password missing lowercase
      await page.locator('input[name="password"]').first().fill('TESTPASSWORD1');
      await page.locator('input[name="confirmPassword"]').first().fill('TESTPASSWORD1');
      await page.locator('button[type="submit"]').first().click({ force: true });
      await expect(page.locator('#password-error').first()).toContainText('lowercase');

      // Test password missing number
      await page.locator('input[name="password"]').first().fill('TestPassword');
      await page.locator('input[name="confirmPassword"]').first().fill('TestPassword');
      await page.locator('button[type="submit"]').first().click({ force: true });
      await expect(page.locator('#password-error').first()).toContainText('number');
    });

    test('signup form validates password match @medium', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Fill valid email and mismatched passwords
      await page.locator('input[name="email"]').first().fill('test@example.com');
      await page.locator('input[name="password"]').first().fill('TestPassword123!');
      await page.locator('input[name="confirmPassword"]').first().fill('TestPassword456!');
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Should show password mismatch error
      await expect(page.locator('#confirm-password-error').first()).toContainText('do not match');
    });

    test('successful signup has link to login page @high', async ({ page }) => {
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      await page.goto(`${BASE_URL}/signup`);
      await page.locator('input[name="email"]').first().fill(email);
      await page.locator('input[name="password"]').first().fill(password);
      await page.locator('input[name="confirmPassword"]').first().fill(password);
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Should show success with link to login
      await expect(page.locator('text=Account Created!').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('a[href="/login"]').first()).toBeVisible();
    });
  });

  test.describe('Password reset flows', () => {
    test('forgot password page renders correctly @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Check page title
      await expect(page).toHaveTitle(/Reset Password/);

      // Check header
      await expect(page.locator('h1').first()).toHaveText('Reset Password');

      // Check instructions
      await expect(page.locator('text=Enter the email address').first()).toBeVisible();

      // Check form elements
      await expect(page.locator('input[name="email"]').first()).toBeVisible();
      await expect(page.locator('button[type="submit"]').first()).toBeVisible();

      // Check link back to login
      await expect(page.locator('a[href="/login"]').first()).toBeVisible();
    });

    test('password reset request shows confirmation @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Request password reset
      await page.locator('input[name="email"]').first().fill('test@example.com');
      await page.locator('button[type="submit"]').first().click({ force: true });

      // Should show success message
      await expect(page.locator('text=Check Your Email').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=you will receive a password reset link').first()).toBeVisible();
      await expect(page.locator('a[href="/login"]').first()).toBeVisible();
    });

    test('forgot password validation works @medium', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Submit without email
      await page.locator('button[type="submit"]').first().click({ force: true });
      await expect(page.locator('#email-error').first()).toBeVisible();

      // Submit with invalid email
      await page.locator('input[name="email"]').first().fill('invalid-email');
      await page.locator('button[type="submit"]').first().click({ force: true });
      await expect(page.locator('#email-error').first()).toContainText('valid email');
    });
  });

  test.describe('Navigation', () => {
    test('login page has link to signup @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Find and click signup link
      const signupLink = page.locator('a[href="/signup"]').first();
      await expect(signupLink).toBeVisible();
      await signupLink.click();

      // Should navigate to signup page
      await expect(page).toHaveURL(`${BASE_URL}/signup`);
    });

    test('signup page has link to login @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Find and click login link
      const loginLink = page.locator('a[href="/login"]').first();
      await expect(loginLink).toBeVisible();
      await loginLink.click();

      // Should navigate to login page
      await expect(page).toHaveURL(`${BASE_URL}/login`);
    });

    test('login page has link to forgot password @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Find and click forgot password link
      const forgotLink = page.locator('a[href="/forgot-password"]').first();
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();

      // Should navigate to forgot password page
      await expect(page).toHaveURL(`${BASE_URL}/forgot-password`);
    });

    test('forgot password page has link to login @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Find and click back to login link
      const loginLink = page.locator('a[href="/login"]').first();
      await expect(loginLink).toBeVisible();
      await loginLink.click();

      // Should navigate to login page
      await expect(page).toHaveURL(`${BASE_URL}/login`);
    });
  });
});
