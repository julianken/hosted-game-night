# Investigation: Auth & OAuth Removal Scope

## Summary

This monorepo implements a complete OAuth 2.1 authorization server in Platform Hub with PKCE enforcement and refresh token rotation. Game apps (Bingo, Trivia) are OAuth clients that verify JWTs via a 4-step chain (E2E secret → SUPABASE_JWT_SECRET → SESSION_TOKEN_SECRET → JWKS). Auth infrastructure spans ~3,110 lines in the shared `@joolie-boolie/auth` package, ~7,090 lines in platform-hub's OAuth/auth routes and libs, plus middleware in each game app. Deleting this removes: the entire OAuth server, cross-app SSO via `jb_*` cookies, JWT verification chains, token refresh logic, and guest-mode authentication support.

## Key Findings

### Finding 1: Platform Hub OAuth Server (Complete Authorization Server Implementation)

**Evidence:**
- OAuth route handlers: `/api/oauth/authorize`, `/api/oauth/token`, `/api/oauth/approve`, `/api/oauth/deny`, `/api/oauth/csrf`, `/api/oauth/authorization-details`
- Location: `/apps/platform-hub/src/app/api/oauth/` (6 route directories with tests)
- Line counts: authorize (344), token (455), csrf, approve, deny, authorization-details (all <150 each)
- Supporting libraries: `/apps/platform-hub/src/lib/oauth/jwt.ts` (159), `e2e-store.ts`, `scopes.ts`, `errors.ts`
- Token management: `/apps/platform-hub/src/lib/token-rotation.ts` (355 lines), `refresh-token-store.ts`
- CSRF: `/apps/platform-hub/src/lib/csrf.ts`, audit logging in `/apps/platform-hub/src/lib/audit-log.ts`

**Confidence:** High

**Implication:** 
- Deleting OAuth server removes game app ability to authenticate users
- Refresh token rotation logic (family tracking, reuse detection) becomes unused
- CSRF protection and audit logging for OAuth events becomes orphaned code
- OAuth client registration scripts (`/apps/platform-hub/scripts/setup-oauth-clients.ts`, `register-oauth-clients.ts`, `verify-oauth-sdk.ts`) become non-functional

### Finding 2: Game App OAuth Clients (PKCE Flow Implementation)

**Evidence:**
- OAuth client library: `/packages/auth/src/oauth-client.ts` (exports `startOAuthFlow`)
- PKCE generator: `/packages/auth/src/pkce.ts` (referenced in test at `apps/bingo/src/lib/auth/__tests__/pkce.test.ts`, `apps/trivia/src/lib/auth/__tests__/pkce.test.ts`)
- OAuth callback page: `/packages/auth/src/components/OAuthCallbackPage.tsx` (345 lines) — handles authorization code exchange
- Token redirect handler: `/packages/auth/src/api/token-redirect-handler.ts` — post-OAuth flow
- Redirect validation: `/packages/auth/src/redirect-validation.ts` — sanitizes post-auth redirects
- E2E test fixtures: `/e2e/fixtures/auth.ts`, `/e2e/fixtures/real-auth.ts`, `/e2e/real-auth/oauth-flow.spec.ts`

**Confidence:** High

**Implication:**
- Both Bingo and Trivia lose ability to authenticate against Platform Hub
- Session storage initialization (`sessionStorage.setItem('jb_oauth_return_to', ...)`, `jb_pkce_verifier_*`, `jb_oauth_state_*`) becomes dead code
- OAuth flow button/UI components in game apps need replacement
- E2E OAuth flow tests (`oauth-flow.spec.ts`, `supabase-login.spec.ts`, `cross-app-sso.spec.ts`) become obsolete

### Finding 3: Middleware Chains (JWT Verification & Session Management)

**Evidence:**
- Shared game middleware factory: `/packages/auth/src/middleware-factory.ts` (creates middleware for both games)
- Game middleware helpers: `/packages/auth/src/game-middleware.ts` (152 lines) — JWT verification, cookie management, route protection
- Token verification chain: `/packages/auth/src/verify-token.ts` (150+ lines) — canonical 4-step verification
- Token refresh utilities: `/packages/auth/src/token-refresh.ts` (96 lines) — proactive token refresh (5 min before expiry)
- Bingo middleware: `/apps/bingo/src/middleware.ts` (37 lines) — wraps `createGameMiddleware`
- Trivia middleware: `/apps/trivia/src/middleware.ts` (37 lines) — wraps `createGameMiddleware`
- Platform Hub middleware: `/apps/platform-hub/src/middleware.ts` (186 lines) — CORS, rate limiting, body size checks, session management
- Supabase middleware: `/apps/platform-hub/src/lib/supabase/middleware.ts` — session cookie refresh

**Confidence:** High

**Implication:**
- Game middleware becomes simpler (no JWT verification needed if no OAuth)
- Proactive token refresh logic (checking `exp` claim, 5-min buffer) becomes unnecessary
- Cookie clearing and setting functions (`jb_access_token`, `jb_refresh_token`, `jb_user_id`) unused
- Protected route matching logic still needed but simplified
- E2E testing bypass logic (`process.env.E2E_TESTING === 'true'`) can remain or be removed

### Finding 4: Token Verification Chain (Multi-Step JWT Validation)

**Evidence:**
- Canonical implementation: `/packages/auth/src/verify-token.ts` (150+ lines)
  - Step 1: E2E secret (only when `E2E_TESTING=true`)
  - Step 2: SUPABASE_JWT_SECRET (HS256 — Platform Hub OAuth tokens)
  - Step 3: SESSION_TOKEN_SECRET (HS256 — backward compatibility)
  - Step 4: Supabase JWKS (ES256 fallback — for SSO tokens)
- JWKS getter: `createJwksGetter(supabaseUrl)` with lazy initialization
- Used by: `game-middleware.ts` (Edge Runtime), `api-auth.ts` (API routes)
- Tests: `/packages/auth/src/__tests__/verify-token.test.ts`

**Confidence:** High

**Implication:**
- All 4 verification steps become unnecessary if no OAuth
- SUPABASE_JWT_SECRET environment variable no longer needed
- SESSION_TOKEN_SECRET backward compatibility no longer relevant
- JWKS remote key fetching becomes dead code (though it's lazily initialized, so low startup cost)
- JWT payload inspection (`payload.exp`, `payload.sub`, `payload.email`) no longer called

### Finding 5: Cookie Handling (SSO Cookie Infrastructure)

**Evidence:**
- Cookie names: `jb_access_token`, `jb_refresh_token`, `jb_user_id`, `jb_return_to`
- Cookie helpers: `/packages/auth/src/game-middleware.ts` — `getCookieOptions()`, `clearAuthCookies()`
- Cookie read locations: `/packages/auth/src/api-auth.ts` (line 87: `request.cookies.get('jb_access_token')`)
- Cookie write locations: 
  - `/packages/auth/src/components/OAuthCallbackPage.tsx` — sets tokens after OAuth
  - `/apps/platform-hub/src/app/api/auth/login/route.ts` (262 lines) — sets `jb_access_token`, `jb_refresh_token`
  - `/apps/platform-hub/src/app/api/auth/sync-session/route.ts` — JWT verification + cookie setting
  - `/packages/auth/src/api/token-handler.ts` — handles token endpoint
- Cookie domain: Potentially cross-domain via `cookieDomain` parameter (`.joolie-boolie.com` for production SSO)
- Cookie clearing: `/apps/platform-hub/src/app/api/auth/logout/route.ts` (68 lines)
- Files affected (50+ matches): apps, packages/auth, e2e tests

**Confidence:** High

**Implication:**
- All `jb_*` cookie read/write code becomes dead
- Cookie domain configuration for cross-app SSO no longer relevant
- Logout API no longer needed (though may handle other cleanup)
- Auth callback page no longer exchanges authorization codes for tokens
- Session sync API (`/api/auth/sync-session`) becomes unnecessary

### Finding 6: Session Management (Supabase + Custom Implementation)

**Evidence:**
- Supabase client creation: `/apps/platform-hub/src/lib/supabase/server.ts`, `/apps/platform-hub/src/lib/supabase/client.ts`, `/apps/bingo/src/lib/supabase/client.ts`, `/apps/trivia/src/lib/supabase/client.ts`
- Session fetching: `/packages/auth/src/hooks/use-session.ts` (React hook, exported from auth package)
- User retrieval: `/packages/auth/src/hooks/use-user.ts`, `/packages/auth/src/api-auth.ts` (server-side)
- Auth provider: `/packages/auth/src/components/auth-provider.tsx` (345 lines) — React context providing auth state, sign-in, sign-up, sign-out
- Middleware user getter: `/packages/auth/src/middleware.ts` (line 241: `getMiddlewareUser()`)
- Session tests: `/packages/auth/src/__tests__/middleware.test.ts`, `/packages/auth/src/__tests__/hooks.test.tsx`
- Session types: `/packages/auth/src/types.ts` (AuthSession, AuthUser, AuthState, AuthContextValue)

**Confidence:** High

**Implication:**
- AuthProvider can become much simpler (no session refresh logic needed)
- `useSession()` hook still needed but no longer checks OAuth tokens
- Supabase client creation still needed for database access, but auth layer simplified
- Session state types still needed but reduced complexity
- Server-side session retrieval logic becomes simpler (no JWT verification)

### Finding 7: @joolie-boolie/auth Package (Shared Auth Library)

**Evidence:**
- Location: `/packages/auth/`
- Core exports from `/packages/auth/src/index.ts`:
  - **Types:** AuthUser, AuthSession, AuthState, AuthContextValue, etc.
  - **Client:** createClient, getClient, resetClient
  - **Hooks:** useAuth, useSession, useUser
  - **Components:** AuthProvider, ProtectedRoute, withAuth, GuestOnly, OAuthCallbackPage
  - **Token utilities:** shouldRefreshToken, isTokenExpired, refreshTokens
  - **API auth:** getApiUser, createAuthenticatedClient
  - **PKCE:** generatePKCE
  - **OAuth client:** startOAuthFlow
  - **Redirect validation:** isValidRedirect, sanitizeRedirect
  - **Token verification:** verifyToken, createJwksGetter
- Subpath exports:
  - `@joolie-boolie/auth/middleware` → updateSession, createAuthMiddleware
  - `@joolie-boolie/auth/middleware-factory` → createGameMiddleware
- Line count: 3,110 lines across 40 source files (excluding tests)
- Used by: all 3 apps (platform-hub, bingo, trivia) and e2e tests

**Confidence:** High

**Implication:**
- Package cannot be deleted entirely (useSession, useUser, AuthProvider still needed)
- ~60-70% of exports become dead code if OAuth removed:
  - All OAuth-related: startOAuthFlow, generatePKCE, OAuthCallbackPage
  - Token refresh: shouldRefreshToken, isTokenExpired, refreshTokens
  - JWT verification: verifyToken, createJwksGetter
  - API auth for game apps: getApiUser (verifies `jb_access_token` cookie)
  - Token handlers: token-redirect-handler, token-handler
  - Protected route HOCs: ProtectedRoute, withAuth, GuestOnly (can be simplified)
- ~30-40% of code retained:
  - useSession, useUser, useAuth hooks
  - AuthProvider context
  - Middleware for route protection (simplified)
  - Basic session/user types
- Package refactoring required: can be split into `@joolie-boolie/auth-core` (session) and `@joolie-boolie/auth-oauth` (deletable)

### Finding 8: API Route Authentication (JWT Cookie Verification for Game APIs)

**Evidence:**
- Game API auth pattern: `/packages/auth/src/api-auth.ts` (162 lines)
  - `getApiUser(request)` — reads `jb_access_token` cookie, verifies JWT, returns `{ id, email }`
  - `createAuthenticatedClient()` — creates Supabase client with service role key
- Used in game API routes: `/api/templates`, `/api/question-sets`, `/api/presets` in Bingo and Trivia
- JWKS getter: Lazily initialized at module load in `api-auth.ts` (line 35-49)
- Verification method: Delegates to `verifyToken()` function
- Tests: `/packages/auth/src/__tests__/api-auth.test.ts`
- Logout handler: `/packages/auth/src/api/logout-handler.ts`
- Token handler: `/packages/auth/src/api/token-handler.ts`

**Confidence:** High

**Implication:**
- All game API routes that check `getApiUser()` need refactoring
- Game APIs currently rely on `jb_access_token` cookie for identifying users
- Removing OAuth means no tokens in cookies, so `getApiUser()` always returns null
- Games lose ability to store user-scoped data (templates, presets, question sets) unless auth mechanism replaced
- Supabase RLS policies may become inaccessible (if they check `auth.uid()`)

## Surprises

1. **Three separate auth mechanisms coexist:** Supabase Auth (native), Platform Hub OAuth server (custom), and E2E test token secret — creating multiple verification paths that all work simultaneously.

2. **Lazy JWKS initialization pattern:** The `createJwksGetter()` function returns a closure that caches the remote JWKS set, delaying the network request until first token verification. This is intentional to avoid blocking middleware module load (see docs/MIDDLEWARE_PATTERNS.md reference).

3. **E2E test tokens are first-class verification method:** When `E2E_TESTING=true`, a test JWT secret takes precedence over all other verification methods, allowing E2E tests to bypass real OAuth entirely.

4. **Refresh token family tracking:** Platform Hub implements OAuth refresh token rotation with "family" tracking to detect reuse attacks (line 355 in token-rotation.ts), which is sophisticated security but entirely dependent on OAuth.

5. **Per-game middleware differences via configuration:** Bingo has `guestModeEnabled: true` while Trivia has it unset (falsy), meaning Bingo allows unauthenticated `/play` access while Trivia requires auth — but this is configured in a single factory, not duplicated.

6. **Cookie domain parameterization:** The auth system is designed for cross-domain SSO by passing `cookieDomain: '.joolie-boolie.com'` (though not visible in game app middleware — only in Platform Hub). This suggests the architecture was prepared for multi-subdomain deployment.

## Unknowns & Gaps

1. **Supabase Auth integration depth:** The codebase references `@supabase/ssr` and `@supabase/supabase-js` but it's unclear if Platform Hub's Supabase Auth (sign-in/sign-up forms) is used for user identity or if it's solely a token signing backend. Dependency on Supabase RLS policies in game apps is not documented.

2. **RLS policy reliance:** Game API routes use `createAuthenticatedClient()` with `SUPABASE_SERVICE_ROLE_KEY` (bypassing Supabase RLS) and apply data isolation at the application level. It's unclear if there are RLS policies on templates/presets/question-sets tables that would break if this pattern is removed.

3. **Cross-app cookie domain behavior:** The code supports `cookieDomain` parameter but no game app actually passes it — only Platform Hub has access to this config. Unclear if SSO cookies are actually shared across `bingo.joolie-boolie.com` and `trivia.joolie-boolie.com` in production.

4. **Session timeout and refresh behavior:** Tests reference session refresh and token expiry, but the exact flow during user interaction is not fully documented. Unclear if middleware proactively refreshes or if it's client-initiated via `useSession()` hook.

5. **Guest mode implications:** Bingo's `guestModeEnabled: true` allows `/play` without auth, but unclear how this interacts with API routes that call `getApiUser()` (which returns null for guests). Do templates/presets work for guests, or are they lost?

## Raw Evidence

### Platform Hub OAuth Routes (Complete List)
```
/apps/platform-hub/src/app/api/oauth/authorize/route.ts       (344 lines)
/apps/platform-hub/src/app/api/oauth/token/route.ts           (455 lines)
/apps/platform-hub/src/app/api/oauth/approve/route.ts         (<150 lines)
/apps/platform-hub/src/app/api/oauth/deny/route.ts            (<150 lines)
/apps/platform-hub/src/app/api/oauth/csrf/route.ts            (<150 lines)
/apps/platform-hub/src/app/api/oauth/authorization-details/route.ts (<150 lines)
```

### Platform Hub Auth Routes
```
/apps/platform-hub/src/app/api/auth/login/route.ts            (262 lines)
/apps/platform-hub/src/app/api/auth/logout/route.ts           (68 lines)
/apps/platform-hub/src/app/api/auth/sync-session/route.ts     (TBD)
/apps/platform-hub/src/app/api/auth/reset-password/route.ts   (TBD)
```

### Platform Hub OAuth Support Libraries
```
/apps/platform-hub/src/lib/oauth/jwt.ts                       (159 lines)
/apps/platform-hub/src/lib/oauth/e2e-store.ts                 (OAuth state store for E2E)
/apps/platform-hub/src/lib/oauth/scopes.ts                    (Scope definitions)
/apps/platform-hub/src/lib/oauth/errors.ts                    (OAuth error types)
/apps/platform-hub/src/lib/token-rotation.ts                  (355 lines)
/apps/platform-hub/src/lib/refresh-token-store.ts             (Refresh token storage)
/apps/platform-hub/src/lib/csrf.ts                            (CSRF token generation)
/apps/platform-hub/src/lib/audit-log.ts                       (OAuth event audit trail)
/apps/platform-hub/src/lib/cron-auth.ts                       (Cleanup job for expired authorizations)
```

### Shared Auth Package (@joolie-boolie/auth)
```
/packages/auth/src/                                            (3,110 lines total)
  oauth-client.ts                    (70 lines)
  pkce.ts                            (TBD)
  verify-token.ts                    (150+ lines)
  game-middleware.ts                 (152 lines)
  middleware.ts                      (266 lines)
  middleware-factory.ts              (200+ lines)
  token-refresh.ts                   (96 lines)
  api-auth.ts                        (162 lines)
  components/
    auth-provider.tsx                (345 lines)
    OAuthCallbackPage.tsx            (345 lines)
    protected-route.tsx              (TBD)
  hooks/
    use-auth.ts                      (TBD)
    use-session.ts                   (TBD)
    use-user.ts                      (TBD)
  api/
    token-handler.ts                 (TBD)
    token-redirect-handler.ts        (TBD)
    logout-handler.ts                (TBD)
```

### Game App Middleware
```
/apps/bingo/src/middleware.ts                                  (37 lines)
/apps/trivia/src/middleware.ts                                 (37 lines)
/apps/platform-hub/src/middleware.ts                           (186 lines)
```

### Cookie References (50+ files match `jb_*` cookies)
- All app-level cookie reads/writes
- E2E test setup files
- OAuth callback flow
- Session management tests

### E2E Tests Affected
```
/e2e/real-auth/oauth-flow.spec.ts
/e2e/real-auth/supabase-login.spec.ts
/e2e/real-auth/cross-app-sso.spec.ts
/e2e/platform-hub/seamless-sso.spec.ts
/e2e/fixtures/auth.ts
/e2e/fixtures/real-auth.ts
/e2e/global-setup-real-auth.ts
```

### Total Auth Infrastructure Size
- Platform Hub OAuth/Auth: ~7,090 lines (routes + libs)
- Shared auth package: ~3,110 lines
- Game app middleware: ~74 lines (both apps)
- Tests: ~500+ lines
- **Total: ~10,774 lines of OAuth/auth-specific code**

