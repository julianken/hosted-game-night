import { test, expect } from '@playwright/test';

/**
 * Platform Hub Authentication E2E Tests
 *
 * Tests cover:
 * - Login flows (valid/invalid credentials, email confirmation)
 * - Signup flows (validation, duplicate emails, success)
 * - Logout flows (session cleanup, redirects)
 * - Password reset flow (email request only - token page not implemented)
 * - Protected route redirects
 * - Session persistence
 *
 * Tags:
 * @critical - Must-work features (login, logout, protected routes)
 * @high - Important flows (signup, validation, password reset)
 * @medium - Secondary features (form validation details)
 */

const BASE_URL = 'http://localhost:3002';

/**
 * Generate unique email for each test run to avoid conflicts
 */
function generateTestEmail(): string {
  return `e2e-test+${Date.now()}@beak-gaming.test`;
}

test.describe('@critical Platform Hub Authentication', () => {
  test.describe('Login flows', () => {
    test('login page renders correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Check page title
      await expect(page).toHaveTitle(/Sign In/);

      // Check header
      await expect(page.locator('h1')).toHaveText('Welcome Back');

      // Check form elements exist
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Check navigation links
      await expect(page.locator('a[href="/signup"]')).toBeVisible();
      await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
    });

    test('user can log in with valid credentials @critical', async ({ page }) => {
      // First, create a test account via signup
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');

      // Wait for signup success message
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Note: In real environment, email confirmation is required
      // For E2E tests, we assume email confirmation is bypassed or handled
      // by test environment setup

      // Now attempt to login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

      // Verify user is authenticated (logout button visible)
      await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    });

    test('invalid login shows error message @critical', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Try to login with non-existent credentials
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message (from Supabase auth)
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    });

    test('empty form shows validation errors @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Click submit without filling form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('#email-error')).toBeVisible();
      await expect(page.locator('#password-error')).toBeVisible();
    });

    test('invalid email format shows error @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Should show email validation error
      await expect(page.locator('#email-error')).toContainText('valid email');
    });

    test('password too short shows error @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', '12345'); // Less than 6 chars
      await page.click('button[type="submit"]');

      // Should show password validation error
      await expect(page.locator('#password-error')).toContainText('at least 6 characters');
    });

    test('session persists after page refresh @critical', async ({ page }) => {
      // Create and login with test account
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

      // Refresh the page
      await page.reload();

      // Should still be on dashboard and authenticated
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
      await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    });

    test('protected routes redirect to login @critical', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto(`${BASE_URL}/dashboard`);

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      // Should have redirect query parameter
      await expect(page).toHaveURL(/redirect=%2Fdashboard/);
    });

    test('protected settings route redirects to login @critical', async ({ page }) => {
      // Try to access settings without authentication
      await page.goto(`${BASE_URL}/settings`);

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      // Should have redirect query parameter
      await expect(page).toHaveURL(/redirect=%2Fsettings/);
    });
  });

  test.describe('Signup flows', () => {
    test('signup page renders correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Check page title
      await expect(page).toHaveTitle(/Create Account/);

      // Check header
      await expect(page.locator('h1')).toHaveText('Create Account');

      // Check form elements exist
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Check password requirements text
      await expect(page.locator('text=At least 8 characters')).toBeVisible();

      // Check link to login
      await expect(page.locator('a[href="/login"]')).toBeVisible();
    });

    test('user can sign up with valid credentials @critical', async ({ page }) => {
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      await page.goto(`${BASE_URL}/signup`);

      // Fill signup form
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=check your email to verify')).toBeVisible();
    });

    test('signup validation works correctly @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('#email-error')).toBeVisible();
      await expect(page.locator('#password-error')).toBeVisible();
      await expect(page.locator('#confirm-password-error')).toBeVisible();
    });

    test('duplicate email shows error message @high', async ({ page }) => {
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // First signup
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Try to signup again with same email
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');

      // Should show error about duplicate email
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    });

    test('email confirmation required message shown @high', async ({ page }) => {
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');

      // Success message should mention email verification
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=check your email to verify')).toBeVisible();
    });

    test('signup form has proper validation @medium', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Test password too short
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test1'); // Less than 8 chars
      await page.fill('input[name="confirmPassword"]', 'Test1');
      await page.click('button[type="submit"]');
      await expect(page.locator('#password-error')).toContainText('at least 8 characters');

      // Test password missing uppercase
      await page.fill('input[name="password"]', 'testpassword1');
      await page.fill('input[name="confirmPassword"]', 'testpassword1');
      await page.click('button[type="submit"]');
      await expect(page.locator('#password-error')).toContainText('uppercase');

      // Test password missing lowercase
      await page.fill('input[name="password"]', 'TESTPASSWORD1');
      await page.fill('input[name="confirmPassword"]', 'TESTPASSWORD1');
      await page.click('button[type="submit"]');
      await expect(page.locator('#password-error')).toContainText('lowercase');

      // Test password missing number
      await page.fill('input[name="password"]', 'TestPassword');
      await page.fill('input[name="confirmPassword"]', 'TestPassword');
      await page.click('button[type="submit"]');
      await expect(page.locator('#password-error')).toContainText('number');

      // Test passwords don't match
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', 'TestPassword456!');
      await page.click('button[type="submit"]');
      await expect(page.locator('#confirm-password-error')).toContainText('do not match');
    });

    test('successful signup has link to login page @high', async ({ page }) => {
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');

      // Should show success with link to login
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('a[href="/login"]')).toBeVisible();
    });
  });

  test.describe('Password reset flows', () => {
    test('forgot password page renders correctly @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Check page title
      await expect(page).toHaveTitle(/Reset Password/);

      // Check header
      await expect(page.locator('h1')).toHaveText('Reset Password');

      // Check instructions
      await expect(page.locator('text=Enter the email address')).toBeVisible();

      // Check form elements
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Check link back to login
      await expect(page.locator('a[href="/login"]')).toBeVisible();
    });

    test('password reset request shows confirmation @high', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Request password reset
      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('text=Check Your Email')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=you will receive a password reset link')).toBeVisible();
      await expect(page.locator('a[href="/login"]')).toBeVisible();
    });

    test('forgot password validation works @medium', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Submit without email
      await page.click('button[type="submit"]');
      await expect(page.locator('#email-error')).toBeVisible();

      // Submit with invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      await expect(page.locator('#email-error')).toContainText('valid email');
    });
  });

  test.describe('Logout flows', () => {
    test('can log out successfully @critical', async ({ page }) => {
      // Create and login with test account
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

      // Click logout
      await page.click('[data-testid="logout-button"]');

      // Should redirect to home
      await expect(page).toHaveURL(BASE_URL, { timeout: 10000 });

      // Logout button should not be visible
      await expect(page.locator('[data-testid="logout-button"]')).not.toBeVisible();

      // Sign In button should be visible
      await expect(page.locator('[data-testid="sign-in-button"]')).toBeVisible();
    });

    test('session cleared after logout @critical', async ({ page }) => {
      // Create and login with test account
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

      // Logout
      await page.click('[data-testid="logout-button"]');
      await expect(page).toHaveURL(BASE_URL, { timeout: 10000 });

      // Try to access dashboard again
      await page.goto(`${BASE_URL}/dashboard`);

      // Should redirect to login (session cleared)
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('redirected to home after logout @critical', async ({ page }) => {
      // Create and login with test account
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

      // Logout
      await page.click('[data-testid="logout-button"]');

      // Should redirect to home page
      await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 10000 });
    });

    test('logout from dashboard works @high', async ({ page }) => {
      // Create and login with test account
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

      // Verify we're on dashboard
      await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();

      // Logout
      await page.click('[data-testid="logout-button"]');
      await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 10000 });
    });

    test('logout from settings works @high', async ({ page }) => {
      // Create and login with test account
      const email = generateTestEmail();
      const password = 'TestPassword123!';

      // Signup
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account Created!')).toBeVisible({ timeout: 10000 });

      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

      // Navigate to settings
      await page.goto(`${BASE_URL}/settings`);
      await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();

      // Logout from settings page
      await page.click('[data-testid="logout-button"]');
      await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 10000 });
    });
  });
});
