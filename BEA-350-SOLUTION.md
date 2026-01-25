# BEA-350: Fix Authentication Rate Limiting in E2E Tests

## Problem

8 E2E tests were failing with timeout errors when waiting for login redirect to `/dashboard`. Error screenshots showed "Request rate limit reached" alerts on the login page.

Despite BEA-349 implementing rate limit bypass in Platform Hub middleware, parallel test execution was still hitting rate limits.

## Root Cause Analysis

The rate limiting was NOT coming from Platform Hub middleware. Investigation revealed:

1. **Platform Hub middleware rate limiting**: Already bypassed via `E2E_TESTING=true` environment variable (BEA-349)
   - OAUTH_PATHS: `/oauth/consent`, `/oauth/authorize`, `/oauth/token`
   - Middleware correctly checks `isE2ETesting` and skips rate limiting

2. **Login flow path**: Uses `/api/auth/login` which is NOT in OAUTH_PATHS
   - This endpoint is NOT rate-limited by our middleware
   - No explicit rate limiting in the login API route

3. **Supabase Auth rate limiting**: The actual bottleneck
   - Supabase has built-in rate limits on auth endpoints:
     - ~30 requests per hour per email address
     - ~10 requests per hour per IP address
   - When 6-8 parallel E2E test workers authenticate simultaneously with the same test user email
   - All requests come from `localhost` (same IP)
   - Result: Thundering herd → immediate rate limit exceeded

## Solution

Implemented two-pronged approach in `e2e/fixtures/auth.ts`:

### 1. Staggered Delays (Prevent Thundering Herd)

- **When**: BEFORE first login attempt
- **Duration**: Random 0-1000ms delay
- **Purpose**: Spreads parallel login requests across a 1-second window
- **Effect**: Reduces simultaneous auth requests to Supabase

```typescript
const staggerDelay = Math.random() * AUTH_STAGGER_MAX_MS; // 0-1000ms
await sleep(staggerDelay);
```

### 2. Exponential Backoff Retry Logic

- **Attempts**: Up to 3 retries
- **Delays**: 2s, 4s, 8s (exponential backoff)
- **Detection**: Checks page content for rate limit error messages
  - Patterns: `/rate limit/i`, `/too many requests/i`, `/try again later/i`, `/exceeded.*limit/i`
- **Early detection**: Uses `Promise.race()` to detect errors within 1 second instead of waiting for full 10s timeout

```typescript
for (let attempt = 1; attempt <= AUTH_RETRY_ATTEMPTS; attempt++) {
  try {
    // Login attempt...
    await Promise.race([dashboardPromise, rateLimitCheckPromise]);
    return; // Success
  } catch (error) {
    if (isRetryable && attempt < AUTH_RETRY_ATTEMPTS) {
      const retryDelay = AUTH_RETRY_DELAY_MS * Math.pow(2, attempt - 1); // 2s, 4s, 8s
      await sleep(retryDelay);
    } else {
      throw error; // Give up
    }
  }
}
```

## Implementation Details

### Files Modified

**`e2e/fixtures/auth.ts`**:
- Added constants:
  - `AUTH_RETRY_ATTEMPTS = 3`
  - `AUTH_RETRY_DELAY_MS = 2000` (base delay)
  - `AUTH_STAGGER_MAX_MS = 1000` (max stagger)
- Added helper functions:
  - `sleep(ms)` - Promise-based delay
  - `isRateLimitError(page)` - Detects rate limit messages on page
- Updated functions:
  - `loginViaPlatformHub()` - Game app fixture helper
  - `authenticatedPage` fixture - Platform Hub tests
- Both functions now:
  1. Add random stagger delay before first attempt
  2. Retry up to 3 times with exponential backoff
  3. Detect rate limit errors quickly via page content check
  4. Use `Promise.race()` to fail fast on errors

### Configuration

**Environment variables** (already set, no changes needed):
- Root `.env`: `E2E_TESTING=true`
- `apps/platform-hub/.env.local`: `E2E_TESTING=true`
- `apps/bingo/.env.local`: `E2E_TESTING=true`
- `apps/trivia/.env.local`: `E2E_TESTING=true`

## Expected Results

### Before Fix
- 8 tests failing with `TimeoutError: page.waitForURL: Timeout 10000ms exceeded`
- Error screenshots showing "Request rate limit reached" on login page
- Failures happen when 6-8 parallel workers try to authenticate simultaneously

### After Fix
- Staggered delays spread authentication attempts across 1-second window
- Retry logic handles transient rate limit errors (e.g., 2 workers collide)
- Early error detection reduces timeout from 10s to ~1s on failures
- Expected: All 8 tests should pass

### Affected Tests
1. `[bingo-mobile] accessibility.spec.ts:221` - large ball display has alt text
2. `[bingo-mobile] accessibility.spec.ts:278` - presenter page passes basic accessibility
3. `[bingo-mobile] accessibility.spec.ts:113` - buttons are keyboard accessible
4. `[bingo-mobile] accessibility.spec.ts:163` - minimum touch target size
5. `[bingo-mobile] accessibility.spec.ts:206` - connection status is announced
6. Plus additional tests in trivia display/dual-screen specs

## Testing

```bash
# 1. Start dev servers (in separate terminal)
cd /Users/j/repos/wt-BEA-350-auth-rate-limit
pnpm dev

# 2. Run specific failing tests
pnpm exec playwright test e2e/bingo/accessibility.spec.ts --grep "large ball display has alt text"
pnpm exec playwright test e2e/bingo/accessibility.spec.ts --grep "presenter page passes basic accessibility"

# 3. Run all affected Bingo mobile tests
pnpm exec playwright test --project=bingo-mobile e2e/bingo/accessibility.spec.ts

# 4. Run full E2E suite to verify no regressions
pnpm exec playwright test
```

## Complexity

**Medium** - Required understanding of:
- Supabase auth rate limiting behavior (not documented in our codebase)
- Thundering herd problem in parallel test execution
- Playwright fixture lifecycle and error handling
- Exponential backoff and staggered delay patterns

## Future Improvements

1. **Auth state caching**: Consider using `.auth/user.json` storage state more aggressively
   - Currently only used by `authenticatedPage` fixture
   - Could be shared across tests to reduce login attempts

2. **Test user pool**: Use multiple test users instead of single shared user
   - Bypasses Supabase's per-email rate limit
   - Would require test user management in Supabase

3. **Playwright configuration**: Consider reducing parallelism specifically for auth tests
   - Add `workers: 2` override for platform-hub project
   - Trade-off: Slower test runs vs. fewer rate limit failures

4. **Mock Supabase in E2E**: Use MSW or Playwright route interception
   - Already implemented in `e2e/platform-hub/auth.spec.ts` for some tests
   - Could extend to all auth-dependent tests
   - Trade-off: More complex setup vs. no rate limit issues
