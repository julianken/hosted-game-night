# E2E Test Debugging Session - 2026-01-23

## Problem Statement
E2E tests were hanging indefinitely when running `pnpm test:e2e`. Tests would never start and the process would need to be manually killed.

## Root Cause Analysis

### Issue #1: Middleware JWKS Module-Load-Time Initialization (CRITICAL)
**Discovery:** Middleware in Bingo and Trivia was initializing JWKS at module load time, causing Next.js dev servers to hang in infinite compilation loop.

**Evidence:**
```bash
# Hung servers with massive CPU time
$ ps -p 93817,93943,94061 -o pid,state,time
  PID STAT      TIME
93817 R    111:42.93 next-server   # Bingo
93943 R    111:22.20 next-server   # Trivia
94061 R    111:02.46 next-server   # Platform Hub

# Lock files present, massive trace files (609KB, 717KB, 247KB)
$ ls -lh apps/*/\.next/dev/lock apps/*/.next/dev/trace
```

**Root Cause:**
```typescript
// apps/bingo/src/middleware.ts (BEFORE)
const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
//     ^^^^^ Module-load-time initialization causes network request during compilation
```

During Next.js compilation, this executes BEFORE the server is ready, potentially causing:
1. Network request to unreachable endpoint
2. Timeout/retry loop during compilation
3. Infinite compilation cycle
4. Server hang with high CPU usage

**Fix:** Lazy initialization with caching:

```typescript
// apps/bingo/src/middleware.ts (AFTER)
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  }
  return jwksCache;
}

async function verifyAccessToken(token: string): Promise<boolean> {
  await jwtVerify(token, getJWKS(), { /* ... */ });  // Now initialized on first use
}
```

**Result:** Servers now start in <1 second instead of hanging infinitely.

### Issue #2: Next.js 16 Async searchParams (BREAKING CHANGE)
**Discovery:** Platform Hub login page was using `searchParams` synchronously, which is now a Promise in Next.js 16 Server Components.

**Error Message:**
```
Error: Route "/login" used `searchParams.redirect`. `searchParams` is a Promise
and must be unwrapped with `await` or `React.use()` before accessing its properties.
```

**Fix:**
```typescript
// apps/platform-hub/src/app/login/page.tsx

// BEFORE
export default function LoginPage({ searchParams }: {
  searchParams: { redirect?: string; authorization_id?: string }
}) {
  return <LoginForm redirectTo={searchParams.redirect || '/'} />;
}

// AFTER
export default async function LoginPage(props: {
  searchParams: Promise<{ redirect?: string; authorization_id?: string }>;
}) {
  const searchParams = await props.searchParams;
  return <LoginForm redirectTo={searchParams.redirect || '/'} />;
}
```

**Impact:** Login page now renders without errors, allowing authentication flow to proceed.

## Testing & Verification

### Server Health After Fixes

```bash
# Bingo & Trivia servers healthy
$ ps -p 53015,53143 -o pid,state,time
  PID STAT      TIME
53015 S      0:01.88 next-server   # Bingo (idle)
53143 S      0:01.65 next-server   # Trivia (idle)

# HTTP responses working
$ curl -o /dev/null -w "%{http_code}" http://localhost:3000
200
$ curl -o /dev/null -w "%{http_code}" http://localhost:3001
200
```

✅ Servers start successfully (604ms, 468ms)
✅ HTTP requests respond immediately with 200 OK
✅ No more infinite compilation loops

### Platform Hub Issue (UNRESOLVED)

⚠️ Platform Hub server still hangs (separate issue from middleware):
```bash
$ ps -p 53332 -o pid,state,time
  PID STAT      TIME
53332 R      1:06.64 next-server   # Continuously accumulating CPU time

$ curl --max-time 15 http://localhost:3002/
# Timeout after 15 seconds
```

**Analysis:** Platform Hub has no JWKS middleware issue. Possible causes:
1. Vitest unit test configuration conflicts (CommonJS/ESM issues observed)
2. Different middleware complexity (rate limiting, CORS, audit logging)
3. Compilation error in Platform Hub-specific code

**Impact on E2E Tests:** E2E tests REQUIRE Platform Hub for authentication (login via localhost:3002), so tests cannot proceed until Platform Hub is fixed.

## Current Status

### ✅ Fixed Issues
1. **Middleware JWKS hang** - Lazy initialization in Bingo and Trivia
2. **Next.js 16 async searchParams** - Login page now async

### ⏸️ Blocked Issues
1. **Platform Hub server hang** - Prevents E2E test execution (authentication requires Platform Hub)
2. **WebKit browser missing** - Minor, only affects mobile variant tests

### 📊 Test Execution Results

**Before fixes:**
- Servers hung indefinitely
- Tests never started
- Manual kill required

**After fixes (partial):**
```
# First successful test run
6 passed (21.2s)
1 failed (timeout during authentication)
5 interrupted
327 did not run
```

**First failing test:** `e2e/bingo/accessibility.spec.ts:103` - "has skip link for keyboard navigation"

**Failure reason:**
```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
waiting for navigation to "http://localhost:3002/dashboard" until "load"
```

Login form submits but Platform Hub doesn't respond, causing timeout.

## Files Modified

### ✅ Completed
1. `apps/bingo/src/middleware.ts` - Lazy JWKS initialization (lines 18-28)
2. `apps/trivia/src/middleware.ts` - Lazy JWKS initialization (lines 18-28)
3. `apps/platform-hub/src/app/login/page.tsx` - Async searchParams (lines 22-26)

### 📝 Created
1. `docs/status/e2e-debugging-session.md` - This debugging session documentation

## Next Steps

### Priority 1: Fix Platform Hub Server Hang
1. **Investigate Vitest configuration** - CommonJS/ESM errors suggest build config issue
2. **Check middleware dependencies** - Rate limiting, CORS may have initialization issues
3. **Review compilation logs** - Identify what's causing infinite compilation
4. **Test Platform Hub in isolation** - Run `pnpm dev` in apps/platform-hub to see errors

### Priority 2: Complete E2E Testing
1. Install WebKit browser: `pnpm exec playwright install webkit`
2. Run full E2E suite once Platform Hub is fixed
3. Complete Task 6 of implementation plan
4. Commit all changes

## Related Documentation

- Next.js 16 async searchParams: https://nextjs.org/docs/messages/sync-dynamic-apis
- Next.js middleware deprecation: https://nextjs.org/docs/messages/middleware-to-proxy
- Implementation plan: `docs/plans/2026-01-23-fix-e2e-auth.md`
- E2E testing guide: `docs/E2E_TESTING.md`

## Lessons Learned

1. **Avoid module-load-time side effects** - Network requests, I/O, or expensive operations at module scope can cause compilation hangs in Next.js
2. **Test middleware changes thoroughly** - Middleware runs on every request and during compilation; bugs here cause widespread failures
3. **Keep up with Next.js breaking changes** - searchParams becoming async in v16 is a significant API change
4. **Systematic debugging pays off** - Using phases (root cause → pattern → hypothesis → implementation) quickly identified the JWKS issue
