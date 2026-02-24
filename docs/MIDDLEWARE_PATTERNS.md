# Next.js Middleware Best Practices

**CRITICAL:** Middleware files execute during module compilation, BEFORE the Next.js server is ready. Never make network requests or perform async operations at module-load time.

## Anti-Pattern: Module-Load-Time Network Requests

```typescript
// WRONG - Causes server to hang indefinitely
import { createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
// Network request executes during compilation -> infinite retry loop -> server hangs

export async function middleware(request: NextRequest) {
  await jwtVerify(token, JWKS, { ... });
}
```

**Why this fails:**
- Module runs during Next.js compilation (before server starts)
- `createRemoteJWKSet()` tries to fetch JWKS from Supabase
- Network stack not ready -> request fails -> error handler retries -> infinite recursion
- Server consumes 100%+ CPU, never responds to HTTP requests

**Evidence of failure:**
```bash
$ ps -o pid,state,time
  PID STAT      TIME
93817 R    111:42.93  # Server hung for 111+ minutes at 117% CPU
```

## Correct Pattern: Lazy Initialization

```typescript
// CORRECT - Defers network request until first use
import { createRemoteJWKSet } from 'jose';

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  }
  return jwksCache;
}

export async function middleware(request: NextRequest) {
  await jwtVerify(token, getJWKS(), { ... }); // Network request only on first HTTP request
}
```

**Why this works:**
- No network requests during module compilation
- JWKS fetch only happens on first middleware invocation (when server is ready)
- Server starts in <1 second
- Singleton pattern ensures JWKS is only fetched once

## Files Using This Pattern

- `apps/bingo/src/middleware.ts` - OAuth token verification
- `apps/trivia/src/middleware.ts` - OAuth token verification

**Note:** Platform Hub uses a different middleware architecture — a multi-layer approach with separate files for CORS, rate limiting, body size validation, and session management, orchestrated by a root `middleware.ts`. See `apps/platform-hub/CLAUDE.md` for details.

**Related:** See `docs/archive/e2e-history/2026-01-23-fix-e2e-auth.md` for full debugging analysis of the server hanging issue.
