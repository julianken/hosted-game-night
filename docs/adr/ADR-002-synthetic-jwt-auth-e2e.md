# ADR-002: Synthetic JWT Auth for E2E Testing

## Status

Accepted

## Context

E2E tests require authenticated user sessions. The production auth flow requires a real Supabase user account, OAuth 2.1 login via Platform Hub, and HS256 JWTs in cookies.

This real-auth flow has two problems for E2E testing:
- Supabase enforces rate limits (~30 login requests/hour per email). With parallel Playwright workers, limits are hit within minutes.
- Real OAuth round-trips add 2-5 seconds per test worker.

## Decision

Introduce a synthetic JWT mode, activated by `E2E_TESTING=true` environment variable:

1. **Platform Hub login route** detects `E2E_TESTING=true` and issues JWTs signed with `E2E_JWT_SECRET` (HS256) instead of going through Supabase.

2. **Game app middleware** (`packages/auth/src/game-middleware.ts`) when `E2E_TESTING=true`, attempts E2E JWT verification first before the normal chain (SUPABASE_JWT_SECRET -> SESSION_TOKEN_SECRET -> JWKS).

3. **Production guard**: Bingo and Trivia middleware throw at startup if `E2E_TESTING=true` and `VERCEL=1`, preventing the bypass from running in production.

4. The `E2E_TESTING` flag is controlled by environment variable, NOT `NODE_ENV`. This allows production builds to be tested locally.

## Consequences

**Positive:**
- No Supabase rate limits during E2E testing.
- Auth setup per test takes ~200ms instead of ~3 seconds.
- `real-auth` project still tests the actual OAuth flow when needed.

**Negative:**
- `E2E_JWT_SECRET` must be kept in sync across all three apps' `.env.local` files.
- The E2E bypass is a backdoor if accidentally deployed -- the `VERCEL=1` guard is the only production safety net.
- Synthetic auth does not exercise the real OAuth token exchange path.

**Files implementing this decision:**
- `packages/auth/src/game-middleware.ts` -- `verifyAccessToken()` E2E branch
- `apps/bingo/src/middleware.ts` -- production guard
- `apps/trivia/src/middleware.ts` -- production guard
- `playwright.config.ts` -- sets `E2E_TESTING=true`
- `e2e/fixtures/auth.ts` -- login via Platform Hub issuing synthetic JWT
