# Phase 2 Iterator 5: Configuration Cross-Cut Analysis
## Middleware, Environment Variables, Config for Standalone Games

**Date:** April 9, 2026  
**Analysis Type:** Cross-cut config review  
**Target:** Games (Bingo, Trivia) transitioning from platform-hub OAuth to standalone

---

## Executive Summary

Games are tightly coupled to Platform Hub through:
1. **Middleware**: 4-step JWT verification chain hardcoded in `middleware-factory.ts`
2. **Token Refresh**: Proactive refresh mechanism calling `${PLATFORM_HUB_URL}/api/oauth/token`
3. **Environment Variables**: 13+ vars scoped to OAuth/Platform Hub
4. **Cookies**: 4 `jb_*` cookies for auth state + return-to handling
5. **Configuration**: CSP directives, turbo.json, package.json scripts all reference OAuth/Hub

**Conversion Impact**: Must remove/simplify all OAuth paths, token refresh, and Platform Hub endpoints while keeping core auth and session management.

---

## 1. MIDDLEWARE ANALYSIS

### 1.1 Current Middleware Structure

**Files involved:**
- `apps/bingo/src/middleware.ts` (thin wrapper)
- `apps/trivia/src/middleware.ts` (thin wrapper)
- `packages/auth/src/middleware-factory.ts` (factory + core logic — 268 lines)
- `packages/auth/src/game-middleware.ts` (utilities — 153 lines)

### 1.2 What Bingo/Trivia Middleware Do

Both games use the **same factory pattern** via `createGameMiddleware()`:

**Bingo Middleware:**
- Routes protected: `['/play']` (presenter view)
- Guest mode: **ENABLED** (allows unauthenticated access)
- Skips: `/` (home), `/display` (audience), `/auth/*`, `/api/*`, static files
- Logger: Uses `@joolie-boolie/error-tracking/server-logger`

**Trivia Middleware:**
- Routes protected: `['/play']` (presenter view)
- Guest mode: **ENABLED** (allows unauthenticated access)
- Skips: `/` (home), `/display` (audience), `/auth/*`, `/api/*`, static files
- Logger: Uses `@joolie-boolie/error-tracking/server-logger`

### 1.3 Core Middleware Logic (`middleware-factory.ts`)

The factory creates a middleware with this 4-step flow:

**Step 1: E2E Testing Bypass**
```ts
if (process.env.E2E_TESTING === 'true' && process.env.VERCEL === '1') {
  throw new Error('E2E mode cannot run in production');
}
```
- Guards against running E2E mode in production
- Uses `E2E_TESTING=true` to bypass verification in tests

**Step 2: Proactive Token Refresh (5-min buffer)**
```ts
if (shouldRefreshToken(accessToken) && refreshToken) {
  const result = await refreshTokens(
    refreshToken,
    PLATFORM_HUB_URL,  // <-- OAuth endpoint
    OAUTH_CLIENT_ID    // <-- OAuth client binding
  );
  // Updates cookies if successful
}
```
- Calls `${PLATFORM_HUB_URL}/api/oauth/token` (grant_type=refresh_token)
- Verifies refreshed token before using
- Falls through to normal verification if refresh fails
- **Critical Issue**: This endpoint won't exist in standalone games

**Step 3: JWT Verification (4-step chain)**
```ts
const isValid = await verifyAccessToken(accessToken, getJWKS, SUPABASE_URL);
```
Verification chain (from `game-middleware.ts`):
1. **E2E secret** (if `E2E_TESTING=true`)
2. **SUPABASE_JWT_SECRET** (if set)
3. **SESSION_TOKEN_SECRET** (backward compat)
4. **Supabase JWKS** (fallback)

**Step 4: Guest Mode Handling**
```ts
if (guestModeEnabled) {
  return NextResponse.next();  // Allow through
} else {
  // Redirect to home with jb_return_to cookie
}
```
- Both games have `guestModeEnabled: true`
- Unauthenticated users proceed to `/play`
- No auth required for gameplay, but tokens are refreshed if present

### 1.4 What Can Be Deleted

For **standalone games**, remove/simplify:

| Code | Can Delete? | Reason |
|------|-------------|--------|
| `refreshTokens()` call | **YES** | No Platform Hub endpoint |
| `shouldRefreshToken()` check | **PARTIAL** | Keep for local/Supabase tokens; remove Platform Hub logic |
| `PLATFORM_HUB_URL` variable | **YES** | Unused in standalone |
| `OAUTH_CLIENT_ID` variable | **YES** | Unused in standalone |
| E2E security guard (Vercel check) | **KEEP** | Still valid for E2E mode |
| Guest mode logic | **KEEP** | Games still allow offline play |
| JWT verification chain | **KEEP** (but simplify) | Need local/Supabase token verification |
| `jb_access_token`, `jb_refresh_token` cookies | **KEEP** | Still used for session; rename or rebrand if desired |
| `clearAuthCookies()` | **PARTIAL** | Keep for logout; simplify logic |
| `getCookieOptions()` | **KEEP** | Still needed for secure cookies |

### 1.5 What Remains

**Simplified middleware for standalone:**

```ts
// 1. Check if token needs verification (kept from Supabase/local secret)
const accessToken = request.cookies.get('jb_access_token')?.value;

// 2. Verify token (skip Platform Hub refresh)
const isValid = await verifyAccessToken(accessToken, getJWKS, SUPABASE_URL);

// 3. If invalid and guest mode, allow through
// If invalid and auth required, redirect to login

// 4. If valid, allow request
```

**Dependencies to keep:**
- `verifyAccessToken()` (JWT verification)
- `getCookieOptions()` (secure cookie defaults)
- `clearAuthCookies()` (logout)
- `isProtectedRoute()` (route matching)
- Zustand/error-tracking logger

**Dependencies to remove:**
- `refreshTokens()` (Platform Hub OAuth)
- `shouldRefreshToken()` (Platform Hub logic)

---

## 2. ENVIRONMENT VARIABLES ANALYSIS

### 2.1 Complete Env Var List

From both `.env.example` files and code references:

#### Supabase Configuration (KEEP)
| Var | Type | Purpose | Standalone |
|-----|------|---------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL | **KEEP** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key | **KEEP** |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Admin operations | **KEEP** |
| `SUPABASE_JWT_SECRET` | Secret | JWT verification | **KEEP** (rename?) |

#### OAuth / Platform Hub Configuration (DELETE)
| Var | Type | Purpose | Standalone |
|-----|------|---------|-----------|
| `NEXT_PUBLIC_PLATFORM_HUB_URL` | Public | Platform Hub base URL | **DELETE** |
| `NEXT_PUBLIC_OAUTH_CLIENT_ID` | Public | OAuth client registration | **DELETE** |
| `NEXT_PUBLIC_OAUTH_REDIRECT_URI` | Public | OAuth callback URL | **DELETE** |
| `NEXT_PUBLIC_OAUTH_CONSENT_URL` | Public | Platform Hub consent page | **DELETE** |
| `SESSION_TOKEN_SECRET` | Secret | HMAC session tokens | **SIMPLIFY** (see below) |

#### Cross-App SSO Configuration (SIMPLIFY/DELETE)
| Var | Type | Purpose | Standalone |
|-----|------|---------|-----------|
| `COOKIE_DOMAIN` | Optional | `.joolie-boolie.com` for cross-domain | **DELETE** (no Platform Hub) |

#### E2E Testing (KEEP)
| Var | Type | Purpose | Standalone |
|-----|------|---------|-----------|
| `E2E_TESTING` | Optional | Enable test mode | **KEEP** |
| `E2E_JWT_SECRET` | Secret (when E2E) | Test JWT secret | **KEEP** |

#### Monitoring & Analytics (KEEP)
| Var | Type | Purpose | Standalone |
|-----|------|---------|-----------|
| `NEXT_PUBLIC_FARO_URL` | Optional | Grafana RUM | **KEEP** |
| `SENTRY_ORG` | Secret | Sentry org slug | **KEEP** |
| `SENTRY_PROJECT` | Secret | Sentry project slug | **KEEP** |
| `NEXT_PUBLIC_APP_URL` | Public | App base URL | **KEEP** |
| `NEXT_PUBLIC_BINGO_URL` | Public | Bingo app URL (multiapp only) | **DELETE** |
| `NEXT_PUBLIC_TRIVIA_URL` | Public | Trivia app URL (multiapp only) | **DELETE** |

#### CI/CD (KEEP)
| Var | Type | Purpose | Standalone |
|-----|------|---------|-----------|
| `TURBO_TOKEN` | Secret | Turbo remote cache | **KEEP** |
| `TURBO_TEAM` | Secret | Turbo team | **KEEP** |

### 2.2 Simplified Env Var Strategy

**For standalone Bingo game:**

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...

# App Configuration (REQUIRED)
NEXT_PUBLIC_APP_URL=https://bingo.example.com

# Optional
E2E_TESTING=        # Set to 'true' only for test runs
E2E_JWT_SECRET=     # Only needed if E2E_TESTING=true
NEXT_PUBLIC_FARO_URL=...  # Grafana RUM
SENTRY_ORG=...
SENTRY_PROJECT=...
```

**SESSION_TOKEN_SECRET Issue:**
- Current code validates `SESSION_TOKEN_SECRET` as required
- **Purpose**: HMAC-signing session tokens (for Platform Hub backward compat)
- **For standalone**: Can this be removed? Need to check if games set/read session tokens
  - Used in `middleware-factory.ts` for token verification fallback
  - May be legacy; check if games actually issue SESSION_TOKEN_SECRET-signed tokens
  - **Recommendation**: Keep for now (part of verification chain); mark as optional in validation

### 2.3 Env Var Deprecation Path

**Phase 1 (Immediate - standalone version):**
```env
# REMOVE these lines
NEXT_PUBLIC_PLATFORM_HUB_URL=
NEXT_PUBLIC_OAUTH_CLIENT_ID=
NEXT_PUBLIC_OAUTH_REDIRECT_URI=
NEXT_PUBLIC_OAUTH_CONSENT_URL=
COOKIE_DOMAIN=

# KEEP everything else
```

**Phase 2 (After testing):**
- Make `SESSION_TOKEN_SECRET` optional
- Remove from env validation if not used

**Phase 3 (Long-term):**
- Investigate if SESSION_TOKEN_SECRET is actually used
- Consider renaming to `GAME_SESSION_SECRET` if kept

---

## 3. TURBO.JSON ANALYSIS

### 3.1 Current turbo.json

**Global passthrough env:**
```json
"globalPassThroughEnv": ["E2E_TESTING"]
```
- Only `E2E_TESTING` passes through (not cached)
- **Status**: Good, keep as-is

**Global env (cached across builds):**
```json
"globalEnv": [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_BINGO_URL",           // <-- DELETE (multiapp only)
  "NEXT_PUBLIC_TRIVIA_URL",          // <-- DELETE (multiapp only)
  "NEXT_PUBLIC_PLATFORM_HUB_URL",    // <-- DELETE (OAuth)
  "NEXT_PUBLIC_OAUTH_CLIENT_ID"      // <-- DELETE (OAuth)
]
```

**Build task env:**
```json
"build": {
  "env": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_BINGO_URL",         // <-- DELETE
    "NEXT_PUBLIC_TRIVIA_URL",        // <-- DELETE
    "NEXT_PUBLIC_SENTRY_DSN",
    "SENTRY_ORG",
    "SENTRY_PROJECT"
  ]
}
```

**Dev/Test tasks:**
- `dev`: No env specified (picks from global)
- `test`, `test:run`, `test:coverage`: No env specified
- `analyze`: `ANALYZE` passthrough only
- `lint`, `typecheck`: No special env

### 3.2 Platform-Hub References in Pipelines

No explicit pipelines for platform-hub in turbo.json. Platform Hub is built via:
- `build:hub`: Uses `turbo build --filter=@joolie-boolie/platform-hub...`
- `dev:hub`: Uses `turbo dev --filter=@joolie-boolie/platform-hub`

These are **package.json scripts only**, not turbo tasks.

### 3.3 Simplification for Standalone

For a standalone Bingo game:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "globalPassThroughEnv": ["E2E_TESTING"],
  "globalEnv": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_APP_URL"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "env": [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_APP_URL",
        "NEXT_PUBLIC_SENTRY_DSN",
        "SENTRY_ORG",
        "SENTRY_PROJECT"
      ]
    }
    // ... rest unchanged
  }
}
```

---

## 4. PACKAGE.JSON SCRIPTS ANALYSIS

### 4.1 Current Scripts

**Root package.json:**

```json
"dev": "turbo dev",
"dev:e2e": "E2E_TESTING=true turbo dev",
"build": "turbo build",
"test": "turbo test",
"test:run": "turbo test:run",
"test:coverage": "turbo test:coverage",
"lint": "turbo lint",
"typecheck": "turbo typecheck",
"clean": "turbo clean && rm -rf node_modules",

// Game-specific:
"dev:bingo": "turbo dev --filter=@joolie-boolie/bingo",
"dev:trivia": "turbo dev --filter=@joolie-boolie/trivia",
"dev:hub": "turbo dev --filter=@joolie-boolie/platform-hub",  // <-- Multiapp only

"build:bingo": "turbo build --filter=@joolie-boolie/bingo...",
"build:trivia": "turbo build --filter=@joolie-boolie/trivia...",
"build:hub": "turbo build --filter=@joolie-boolie/platform-hub...",  // <-- Multiapp only

"analyze": "turbo analyze",
"analyze:bingo": "turbo analyze --filter=@joolie-boolie/bingo",
"analyze:trivia": "turbo analyze --filter=@joolie-boolie/trivia",
"analyze:hub": "turbo analyze --filter=@joolie-boolie/platform-hub",  // <-- Multiapp only

"lighthouse": "lhci autorun",
"lighthouse:bingo": "lhci autorun --config=apps/bingo/lighthouserc.js",
"lighthouse:trivia": "lhci autorun --config=apps/trivia/lighthouserc.js",
"lighthouse:hub": "lhci autorun --config=apps/platform-hub/lighthouserc.js",  // <-- Multiapp only

"vercel:link": "echo 'Run: cd apps/<app> && vercel link' ...",

// E2E Tests (all multiapp):
"test:e2e": "./scripts/e2e-with-build.sh",
"test:e2e:dev": "playwright test",
"test:e2e:bingo": "./scripts/e2e-with-build.sh --project=bingo",
"test:e2e:trivia": "./scripts/e2e-with-build.sh --project=trivia",
"test:e2e:critical": "./scripts/e2e-with-build.sh --grep @critical",
"test:e2e:high": "./scripts/e2e-with-build.sh --grep '@critical|@high'",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report",
"test:e2e:real-auth": "./scripts/e2e-real-auth.sh",  // <-- OAuth-dependent
"test:e2e:summary": "node scripts/test-summary.js",

"prepare": "husky"
```

### 4.2 What to Delete/Update

For **standalone Bingo**:

| Script | Action | Reason |
|--------|--------|--------|
| `dev:bingo` | KEEP | Still needed for dev |
| `dev:hub` | **DELETE** | No Platform Hub |
| `build:bingo` | KEEP | Still needed for builds |
| `build:hub` | **DELETE** | No Platform Hub |
| `analyze:bingo` | KEEP | Still needed |
| `analyze:hub` | **DELETE** | No Platform Hub |
| `lighthouse:bingo` | KEEP | Still needed |
| `lighthouse:hub` | **DELETE** | No Platform Hub |
| `test:e2e:real-auth` | **SIMPLIFY** | Needs local auth instead of OAuth |
| All multiapp E2E scripts | **KEEP** (but update) | May still run for coverage |

### 4.3 New Scripts Needed

```json
"dev:bingo": "turbo dev --filter=@joolie-boolie/bingo",
"build:bingo": "turbo build --filter=@joolie-boolie/bingo...",
"start:bingo": "node apps/bingo/.next/standalone/server.js",
"test:e2e:standalone": "./scripts/e2e-standalone.sh"
```

---

## 5. NEXT.JS CONFIG ANALYSIS

### 5.1 Both Apps Use Identical Config

**File locations:**
- `apps/bingo/next.config.ts`
- `apps/trivia/next.config.ts`

**Key sections:**

#### A. Server External Packages (KEEP)
```ts
serverExternalPackages: [
  "esbuild-wasm",
  "@opentelemetry/api",
  "@opentelemetry/sdk-trace-base",
  "@opentelemetry/exporter-trace-otlp-http",
  "@opentelemetry/resources",
  "@opentelemetry/semantic-conventions",
]
```
- Used for observability; unrelated to auth
- **Action**: KEEP

#### B. Transpile Packages (KEEP)
```ts
transpilePackages: [
  '@joolie-boolie/sync',
  '@joolie-boolie/ui',
  '@joolie-boolie/theme',
  '@joolie-boolie/auth',        // <-- Auth package (needed)
  '@joolie-boolie/database',
]
```
- Still needed for auth, sync, UI, etc.
- **Action**: KEEP

#### C. Rewrites (KEEP)
```ts
async rewrites() {
  return [
    { source: "/sw.js", destination: "/serwist/sw.js" },
    { source: "/sw.js.map", destination: "/serwist/sw.js.map" },
  ];
}
```
- Service worker mapping; unrelated to OAuth
- **Action**: KEEP

#### D. Security Headers (KEEP)
```ts
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        {
          key: 'Content-Security-Policy-Report-Only',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co https://*.grafana.net /monitoring; font-src 'self'; worker-src 'self'; frame-src 'none'; report-uri /api/csp-report",
        },
        {
          key: 'Report-To',
          value: JSON.stringify({
            group: 'csp-endpoint',
            max_age: 86400,
            endpoints: [{ url: '/api/csp-report' }],
          }),
        },
      ],
    },
  ];
}
```

**CSP Analysis:**
- `connect-src 'self' https://*.supabase.co https://*.grafana.net /monitoring`
  - Allows Supabase API calls (needed)
  - Allows Grafana/monitoring (optional but kept)
  - No Platform Hub domain listed (good!)
- `frame-src 'none'` — No iframes allowed
  - Prevents OAuth consent page in iframe (good for standalone)

**Action**: KEEP (CSP already excludes Platform Hub)

#### E. Sentry & Bundle Analyzer (KEEP)
```ts
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withSentryConfig(withAnalyzer(withSerwist(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
```
- Unrelated to OAuth
- **Action**: KEEP

### 5.2 Conclusion

**No changes needed** to next.config.ts for standalone conversion. Config is already clean of OAuth-specific directives.

---

## 6. COOKIE CLEANUP ANALYSIS

### 6.1 Current Cookie Names and Usage

All `jb_*` cookies are defined in `packages/auth/src/game-middleware.ts`:

```ts
response.cookies.set('jb_access_token', '', opts);      // httpOnly: true
response.cookies.set('jb_refresh_token', '', opts);     // httpOnly: true
response.cookies.set('jb_user_id', '', { ...opts, httpOnly: false });  // Client-readable
```

Additional cookies from `middleware-factory.ts`:

```ts
response.cookies.set('jb_return_to', pathname, {
  path: '/',
  maxAge: 300,  // 5 minutes
  httpOnly: false,  // Client-side JS reads this
});
```

### 6.2 Cookie Usage Across Games

**Who sets cookies:**
1. `packages/auth/src/api/token-handler.ts` — OAuth token exchange response
2. `packages/auth/src/api/logout-handler.ts` — Clears cookies
3. `packages/auth/src/middleware-factory.ts` — Sets `jb_return_to` on auth redirect
4. OAuth client JS — Session storage of PKCE/state (via `jb_oauth_*` sessionStorage, not cookies)

**Who reads cookies:**
1. `middleware-factory.ts` — Reads `jb_access_token`, `jb_refresh_token`
2. `api-auth.ts` — Reads `jb_access_token` for API request auth
3. `oauth-client.ts` — Reads sessionStorage for `jb_oauth_return_to`, `jb_pkce_verifier_*`, `jb_oauth_state_*`
4. Client-side JS — Reads `jb_return_to` to redirect after login

### 6.3 SessionStorage References (Not Cookies)

```ts
// oauth-client.ts
sessionStorage.setItem('jb_oauth_return_to', returnTo);
sessionStorage.removeItem('jb_oauth_return_to');
sessionStorage.setItem(`jb_pkce_verifier_${state}`, codeVerifier);
sessionStorage.setItem(`jb_oauth_state_${state}`, state);
```

These are **sessionStorage keys** (not HTTP cookies), used only during OAuth flow. For standalone games, these can be deleted when OAuth code is removed.

### 6.4 Cleanup for Standalone

**Keep these cookies:**
- `jb_access_token` — Session token (rename to `access_token`?)
- `jb_refresh_token` — Refresh token (rename to `refresh_token`?)
- `jb_user_id` — User ID (rename to `user_id`?)

**Delete these cookies:**
- `jb_return_to` — Only used in OAuth flow (post-OAuth redirect)

**Delete these sessionStorage keys:**
- `jb_oauth_return_to` — OAuth return-to handling
- `jb_pkce_verifier_*` — PKCE flow
- `jb_oauth_state_*` — OAuth state validation

### 6.5 Cookie Renaming Strategy

**Option A (Clean break):**
Change all cookie names to remove `jb_` prefix:
```ts
response.cookies.set('access_token', accessToken, opts);
response.cookies.set('refresh_token', refreshToken, opts);
response.cookies.set('user_id', userId, opts);
```

**Option B (Keep for compatibility):**
Keep `jb_*` names as "Joolie Boolie" branding.

**Recommendation**: **Option A** is cleaner. The `jb_` prefix made sense for multi-app SSO (to avoid collisions). For standalone games, simpler names are better.

---

## 7. SUMMARY TABLE: What to Keep/Delete/Simplify

### Middleware

| Component | Status | Action |
|-----------|--------|--------|
| `middleware-factory.ts` | **MODIFY** | Remove Platform Hub refresh logic; simplify to local-only verification |
| `game-middleware.ts` | **MODIFY** | Remove PLATFORM_HUB_URL and OAUTH_CLIENT_ID references |
| `verifyAccessToken()` | **KEEP** | JWT verification still needed |
| `refreshTokens()` function | **DELETE** | Platform Hub endpoint won't exist |
| `shouldRefreshToken()` | **DELETE** | Platform Hub-specific logic |
| `clearAuthCookies()` | **KEEP** | Logout handling |
| `getCookieOptions()` | **KEEP** | Secure cookie defaults |
| `isProtectedRoute()` | **KEEP** | Route matching |

### Environment Variables

| Variable | Status | Action |
|----------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | **KEEP** | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **KEEP** | Supabase auth |
| `SUPABASE_SERVICE_ROLE_KEY` | **KEEP** | Admin operations |
| `SUPABASE_JWT_SECRET` | **KEEP** | JWT verification |
| `NEXT_PUBLIC_PLATFORM_HUB_URL` | **DELETE** | OAuth-only |
| `NEXT_PUBLIC_OAUTH_CLIENT_ID` | **DELETE** | OAuth-only |
| `NEXT_PUBLIC_OAUTH_REDIRECT_URI` | **DELETE** | OAuth-only |
| `NEXT_PUBLIC_OAUTH_CONSENT_URL` | **DELETE** | OAuth-only |
| `SESSION_TOKEN_SECRET` | **SIMPLIFY** | Make optional; may not be used |
| `COOKIE_DOMAIN` | **DELETE** | Cross-domain SSO not needed |
| `E2E_TESTING` | **KEEP** | Test mode bypass |
| `E2E_JWT_SECRET` | **KEEP** | Test JWT signing |
| `NEXT_PUBLIC_APP_URL` | **KEEP** | App base URL |
| `NEXT_PUBLIC_BINGO_URL` | **DELETE** | Multiapp reference |
| `NEXT_PUBLIC_TRIVIA_URL` | **DELETE** | Multiapp reference |

### turbo.json

| Item | Status | Action |
|------|--------|--------|
| `globalPassThroughEnv: ["E2E_TESTING"]` | **KEEP** | Test mode |
| `globalEnv` (Platform Hub refs) | **DELETE** | Remove `*_PLATFORM_HUB_*`, `*_OAUTH_*`, `*_BINGO_URL`, `*_TRIVIA_URL` |
| `build.env` (multiapp refs) | **DELETE** | Remove `NEXT_PUBLIC_BINGO_URL`, `NEXT_PUBLIC_TRIVIA_URL` |

### package.json

| Script | Status | Action |
|--------|--------|--------|
| `dev:bingo` | **KEEP** | Game dev |
| `dev:hub` | **DELETE** | No Platform Hub |
| `build:bingo` | **KEEP** | Game builds |
| `build:hub` | **DELETE** | No Platform Hub |
| `test:e2e:real-auth` | **REWRITE** | Use local auth, not OAuth |

### next.config.ts

| Section | Status | Action |
|---------|--------|--------|
| `serverExternalPackages` | **KEEP** | Observability, unrelated |
| `transpilePackages` | **KEEP** | Still needed for auth, UI, etc. |
| `rewrites` (service worker) | **KEEP** | Unrelated |
| `headers` (CSP) | **KEEP** | Already excludes Platform Hub |
| `Sentry`, `Analyzer` | **KEEP** | Unrelated |

### Cookies

| Cookie | Status | Action |
|--------|--------|--------|
| `jb_access_token` | **RENAME** | → `access_token` (or keep for backward compat) |
| `jb_refresh_token` | **RENAME** | → `refresh_token` |
| `jb_user_id` | **RENAME** | → `user_id` |
| `jb_return_to` | **DELETE** | OAuth-only |
| `jb_oauth_*` (sessionStorage) | **DELETE** | OAuth-only |
| `jb_pkce_verifier_*` | **DELETE** | OAuth-only |
| `jb_oauth_state_*` | **DELETE** | OAuth-only |

---

## 8. CONVERSION CHECKLIST

### Phase 1: Environment Setup
- [ ] Remove OAuth env vars from `.env.example`
- [ ] Remove cross-domain cookie domain from `.env.example`
- [ ] Update `.env.local` in game apps
- [ ] Mark `SESSION_TOKEN_SECRET` as optional (or investigate if needed)

### Phase 2: Middleware Simplification
- [ ] Remove `refreshTokens()` calls from `middleware-factory.ts`
- [ ] Remove `shouldRefreshToken()` logic
- [ ] Remove `PLATFORM_HUB_URL` and `OAUTH_CLIENT_ID` variable references
- [ ] Simplify guest-mode redirect (remove `jb_return_to` cookie logic)
- [ ] Test with E2E mode: `E2E_TESTING=true`

### Phase 3: Configuration Updates
- [ ] Update `turbo.json` (remove OAuth/multiapp env vars)
- [ ] Update `package.json` scripts (remove `dev:hub`, `build:hub`, etc.)
- [ ] Verify `next.config.ts` needs no changes (CSP already clean)

### Phase 4: Cookie Cleanup
- [ ] Decide on cookie naming (keep `jb_*` or rename)
- [ ] Remove OAuth callback handler (if separate route exists)
- [ ] Remove sessionStorage cleanup for OAuth (PKCE/state/return-to)

### Phase 5: Testing
- [ ] Run `pnpm test:e2e:bingo` with local auth
- [ ] Verify token refresh doesn't fail gracefully
- [ ] Verify guest mode still works
- [ ] Verify logout clears cookies

### Phase 6: Deployment
- [ ] Update Vercel env vars (remove Platform Hub refs)
- [ ] Test standalone build: `turbo build --filter=@joolie-boolie/bingo...`
- [ ] Verify CSP in production

---

## 9. MIGRATION RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Token refresh silently fails | Medium | Check `result.ok` in middleware; log gracefully |
| `SESSION_TOKEN_SECRET` still required | Low | Make optional in validation; investigate usage |
| Cross-domain cookies in production | Low | Only affects multiapp setup; remove `COOKIE_DOMAIN` |
| E2E tests hardcoded to Platform Hub | Medium | Rewrite E2E scripts to use local auth |
| Old clients with `jb_` cookies | Low | Cookies automatically expire or clear on logout |

---

## 10. FINAL NOTES

1. **Middleware Factory**: The factory is well-designed for extensibility. Removing Platform Hub logic is straightforward — delete `refreshTokens()` call and dependencies.

2. **Env Vars**: Games are currently over-configured for OAuth. Standalone setup is 60% of current complexity (Supabase only, no Platform Hub).

3. **Next.js Config**: Already clean. No CSP directives, rewrites, or redirects tied to OAuth. CSP even excludes Platform Hub by default.

4. **Cookies**: Can be renamed without breaking anything. Consider this a rebranding opportunity (remove `jb_` prefix for clarity).

5. **turbo.json**: Minimal cleanup needed. Remove multiapp env refs and Platform Hub references.

6. **Testing**: E2E tests that use `test:e2e:real-auth` will need rewriting to skip OAuth and use local token generation.

---

**Analysis Complete**  
*See linked iterators for API route changes, database simplifications, and testing strategy.*
