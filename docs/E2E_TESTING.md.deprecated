# E2E Testing Guide

## Overview

E2E tests use Playwright to test the full Beak Gaming Platform including OAuth authentication flows.

## Architecture

- **Platform Hub (port 3002):** OAuth server, user authentication
- **Bingo (port 3000):** Game app with OAuth client
- **Trivia (port 3001):** Game app with OAuth client

All game apps use cross-app SSO via `beak_access_token` cookies.

## Setup

### Prerequisites

1. **Supabase Project**: You need a Supabase project with the database configured
2. **Environment Variables**: `.env.local` files in each app with Supabase credentials
3. **Test User**: E2E tests require a test user account in your Supabase database

### Creating the Test User

E2E tests require a test user account in your Supabase database. Run the seed script to create it:

#### Option 1: Via Supabase Dashboard (Easiest)

1. Open your Supabase project: https://supabase.com/dashboard
2. Go to **SQL Editor**
3. Open the file `supabase/seed.sql` from this repository
4. Copy the contents and paste into the SQL Editor
5. Click **Run**

You should see: `Created E2E test user: e2e-test@beak-gaming.test`

#### Option 2: Via Supabase CLI (If installed)

```bash
# Reset database and run all migrations + seed
supabase db reset

# Or just run the seed file
supabase db execute --file supabase/seed.sql
```

#### Verify Test User

Check the test user was created:

```sql
SELECT email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'e2e-test@beak-gaming.test';
```

You should see one row with the test user email.

### Using a Custom Test User

If you want to use a different test user (e.g., for CI/CD):

1. Create the user in Supabase (Dashboard → Authentication → Users → Add User)
2. Set environment variables before running tests:

```bash
export TEST_USER_EMAIL=your-test@example.com
export TEST_USER_PASSWORD=YourPassword123!
pnpm playwright test
```

**Note:** The default test user (`e2e-test@beak-gaming.test`) is recommended for local development because it's created by the seed script and doesn't require environment variables.

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific app tests
pnpm playwright test --project=bingo
pnpm playwright test --project=trivia
pnpm playwright test --project=platform-hub

# Run specific test file
pnpm playwright test e2e/bingo/presenter.spec.ts --project=bingo

# Debug mode
pnpm playwright test --debug
```

## Authentication

### Test User

E2E tests use a test user account:

- Email: `e2e-test@beak-gaming.test`
- Password: `TestPassword123!`

Override with environment variables:

```bash
export TEST_USER_EMAIL=custom@example.com
export TEST_USER_PASSWORD=CustomPassword123!
```

### Authentication Fixtures

Located in `e2e/fixtures/auth.ts`:

#### `authenticatedPage`
Pre-authenticated Platform Hub page (dashboard).

```typescript
test('dashboard test', async ({ authenticatedPage }) => {
  // Already logged in to Platform Hub
  await authenticatedPage.goto('/settings');
});
```

#### `authenticatedBingoPage`
Pre-authenticated Bingo `/play` page.

```typescript
test('bingo presenter test', async ({ authenticatedBingoPage: page }) => {
  // Already on /play, authenticated via SSO
  await expect(page.getByRole('button', { name: /open display/i })).toBeVisible();
});
```

#### `authenticatedTriviaPage`
Pre-authenticated Trivia `/play` page.

```typescript
test('trivia presenter test', async ({ authenticatedTriviaPage: page }) => {
  // Already on /play, authenticated via SSO
  await expect(page.getByRole('button', { name: /start game/i })).toBeVisible();
});
```

### Public Routes

Home pages and display views don't require authentication:

```typescript
test('home page', async ({ page }) => {
  await page.goto('/');
  // No auth needed
});

test('audience display', async ({ page }) => {
  await page.goto('/display');
  // No auth needed
});
```

## Writing New Tests

### Protected Routes (require auth)

For tests accessing `/play` or other protected routes:

```typescript
import { test, expect } from '../fixtures/auth';

test('my test', async ({ authenticatedBingoPage: page }) => {
  // page is already authenticated on /play
  // ... test code
});
```

### Public Routes (no auth)

For home pages, display views, login pages:

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/');
  // ... test code
});
```

## Troubleshooting

### Tests timeout waiting for elements

**Problem:** Test redirects to home page instead of loading `/play`.

**Cause:** Missing authentication or expired cookies.

**Fix:** Use `authenticatedBingoPage` or `authenticatedTriviaPage` fixture.

### "beak_access_token cookie not set" error

**Problem:** OAuth login failed in fixture.

**Causes:**
- Platform Hub not running (port 3002)
- Test user doesn't exist
- Database connection issues

**Fix:** Ensure all three web servers are running:

```bash
pnpm dev:hub    # Port 3002
pnpm dev:bingo  # Port 3000
pnpm dev:trivia # Port 3001
```

### Cookies not shared between apps

**Problem:** Auth works on Platform Hub but not Bingo/Trivia.

**Cause:** Cookie domain mismatch.

**Fix:** In development, `NEXT_PUBLIC_COOKIE_DOMAIN` should be unset or empty. Localhost doesn't support cross-domain cookies - cookies use exact domain matching instead.

## Best Practices

1. **Use fixtures for protected routes** - Always use `authenticatedBingoPage` / `authenticatedTriviaPage` for `/play` tests
2. **Test isolation** - Each test gets fresh auth state
3. **No manual login** - Let fixtures handle authentication
4. **Public route tests** - Use standard `page` fixture for public pages
5. **Parallel execution** - Tests run in parallel, fixtures ensure isolation
