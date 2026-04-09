# Phase 2 Iterator 3: Deployment & Server Architecture Analysis

## Executive Summary

**Static export is NOT viable** for either game app. The BFF pattern with API routes is essential:

1. **API routes cannot be removed** — trivia-api proxies require server-side fetch to bypass CORS
2. **Server components exist** — home page uses `async` server components and cookie reading
3. **Middleware is mandatory** — guest mode, JWT verification, body size limits
4. **Service Worker caching is smart** — already excludes `/api/auth/` routes properly
5. **2-app deployment is easier** — eliminates platform-hub completely

**Recommendation: Keep Next.js with SSR/API routes. Simplify deployment to 2 domains.**

---

## 1. Static Export Viability: NOT POSSIBLE

### Finding: Apps Cannot Use `output: 'export'`

**Status:** ❌ BLOCKED

**Reasons:**

1. **Server Components in Home Page** (`/play/page.tsx`):
   - Line 7: `export default async function Home()`
   - Reads cookies: `const cookieStore = await cookies();`
   - Checks authentication: `const accessToken = cookieStore.get('jb_access_token');`
   - This is async server component code that runs at **build time only** in static exports
   - Runtime cookie values would be lost

2. **API Routes Required** (cannot be compiled away):
   - Authentication API routes (`/api/auth/token`, `/api/auth/logout`)
   - CSP reporting (`/api/csp-report`)
   - Monitoring tunnel (`/api/monitoring-tunnel`)
   - Health checks (`/api/health`)
   - Trivia-API proxy (`/api/trivia-api/*`)
   - Template/Preset/Question-Set CRUD

3. **No `generateStaticParams` for Dynamic Routes**:
   - Dynamic API routes like `/api/templates/[id]` cannot be pre-built
   - `next.config.ts` has no `output: 'export'` setting anywhere

4. **Middleware** (`middleware.ts`):
   - Guest mode authorization
   - JWT verification
   - Body size limits
   - Middleware is server-only and cannot run in static export

**Trivia next.config.ts:**
- No `output: 'export'` configured
- Uses `rewrites()` for `/sw.js` (requires server)
- Uses `headers()` for security headers (requires server)
- Uses `withSerwist()` which needs runtime service worker route support

**Bingo next.config.ts:**
- Identical situation — no static export possible

### Conclusion

**Both Trivia and Bingo must remain SSR (server-side rendered) with API routes.**

---

## 2. Trivia-API Proxy Analysis

### File Locations

- **Questions endpoint:** `/apps/trivia/src/app/api/trivia-api/questions/route.ts` (226 lines)
- **Categories endpoint:** `/apps/trivia/src/app/api/trivia-api/categories/route.ts` (125 lines)
- **API client:** `/apps/trivia/src/lib/trivia-api/client.ts` (server-only)

### Design Review

**GET `/api/trivia-api/questions`** (BFF Proxy):
- Query parameters: `limit`, `categories`, `difficulties`, `excludeNiche`
- Validates all inputs against allowlists
- In-process cache (memory) with cache key generation
- Fetches from `https://the-trivia-api.com/v2/questions` on cache miss
- Converts questions via adapter (`triviaApiQuestionsToQuestions`)
- Returns: `{ questions, meta: { fetchedAt, totalFetched, source, cached } }`

**GET `/api/trivia-api/categories`** (Static):
- Returns static category mapping (immutable)
- Cache-Control: `public, max-age=86400` (24 hours)
- No fetch involved

### CORS Assessment

**the-trivia-api.com does NOT expose CORS headers for browser clients.** This is evidenced by:

1. **Server-only client:** `/lib/trivia-api/client.ts` is a Node.js fetch (no browser imports)
2. **Route comment:** "BFF Proxy — Public endpoint (no auth required)"
3. **No fetch-from-browser anywhere:** All trivia API calls go through Next.js API route
4. **No CORS workaround in client code:** No `fetch()` calls with special headers

### Standalone Mode Options

**Option A: Keep BFF (Current)**
- Pros: Caching, error handling, parameter validation, CORS bypass, auth-agnostic
- Cons: Requires server

**Option B: Client-side fetch with workaround**
- Would need CORS proxy or change external API provider
- the-trivia-api.com doesn't enable CORS → requires external proxy
- Example: `https://cors-anywhere.herokuapp.com/` (not reliable)
- **Not recommended:** adds latency, fragile

**Option C: Replace API provider**
- Switch to provider with public CORS (e.g., Open Trivia Database)
- Breaking change
- **Not recommended for this phase**

### Conclusion

**Keep the BFF proxy.** It's well-designed for guest mode and handles the CORS problem elegantly. Removing the server would require an unreliable external CORS proxy or API provider change.

---

## 3. Monitoring Routes Analysis

### Routes

| Route | Handler | Purpose |
|-------|---------|---------|
| `/api/csp-report` | CSP violation logger | Records Content-Security-Policy violations |
| `/api/monitoring-tunnel` | Sentry monitoring tunnel | Forwards error reports through Vercel to Sentry |

### CSP Report Route

**File:** `/apps/trivia/src/app/api/csp-report/route.ts` (14 lines)

```typescript
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    logger.warn('CSP violation', { violation: body['csp-report'] ?? body });
  } catch {
    // malformed body — still return 204
  }
  return new NextResponse(null, { status: 204 });
}
```

**Purpose:** Browser sends CSP violation reports to `/api/csp-report` (per CSP header in next.config.ts).

**Configured in:** next.config.ts line 47:
```
"report-uri /api/csp-report"
```

### Monitoring Tunnel

**File:** `/apps/trivia/src/app/api/monitoring-tunnel/route.ts` (3 lines)

```typescript
import { createMonitoringTunnelHandler } from '@joolie-boolie/error-tracking/monitoring-tunnel';
export const POST = createMonitoringTunnelHandler('api-trivia-monitoring-tunnel');
```

**Purpose:** Vercel's built-in proxy for Sentry integration. Prevents browser sending data to external Sentry domain.

**Configured in:** next.config.ts line 71:
```javascript
tunnelRoute: '/monitoring'
```

### Standalone Mode Assessment

#### CSP Report Removal

**Can be removed:** YES
- CSP violations are logged to Sentry anyway
- Removing the route means CSP violations go directly to browser console only
- Loss: Centralized server-side CSP monitoring
- Impact: Medium (nice-to-have feature)

#### Monitoring Tunnel Removal

**Must be kept:** YES (if using Sentry)
- Without the tunnel, Sentry sends data to `https://<project>.ingest.sentry.io`
- Browser CORS blocks this
- Tunnel acts as same-origin proxy
- **Cannot be replaced by client-side Sentry:** browsers cannot reach Sentry servers

**Alternative:** Disable Sentry entirely
- Remove `@sentry/nextjs` dependency
- Remove `withSentryConfig()` wrapper
- Remove error boundary
- Loss: Crash tracking, error analytics

### Conclusion

**Keep monitoring tunnel if Sentry is used.** CSP reporting is optional but recommended for security monitoring. Both routes have negligible overhead.

---

## 4. Vercel Deployment Architecture

### Current Setup (3 Projects)

| Project | Domain | Vercel Config | Build Command |
|---------|--------|---------------|---------------|
| **Bingo** | `bingo.joolie-boolie.com` | `apps/bingo/vercel.json` | `cd ../.. && pnpm turbo build --filter=@joolie-boolie/bingo...` |
| **Trivia** | `trivia.joolie-boolie.com` | `apps/trivia/vercel.json` | `cd ../.. && pnpm turbo build --filter=@joolie-boolie/trivia...` |
| **Platform Hub** | `joolie-boolie.com` (root) | `apps/platform-hub/vercel.json` | `cd ../.. && pnpm turbo build --filter=@joolie-boolie/platform-hub...` |

### Vercel Config Details

All three `vercel.json` files follow the same pattern:

```json
{
  "version": 2,
  "framework": "nextjs",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm turbo build --filter=...",
  "outputDirectory": ".next",
  "env": {
    "TURBO_TEAM": "joolie-boolie",
    "TURBO_REMOTE_ONLY": "true"
  },
  "headers": [ /* SW and manifest cache headers */ ],
  "rewrites": [ /* /display and /play route rewrites */ ]
}
```

**Key features:**
- Turbo remote caching enabled (`TURBO_REMOTE_ONLY: true`)
- Monorepo-aware builds (filters to specific app)
- Service worker caching configured
- Header and rewrite rules for PWA support

### Standalone Deployment (2 Projects)

**Scenario: Remove platform-hub, keep only games**

#### Option A: Separate Vercel Projects (Current Model)

**✅ Recommended for Phase 3**

- **Bingo:** `bingo.example.com` (keep existing)
- **Trivia:** `trivia.example.com` (keep existing)
- **Changes:**
  - Redirect root domain to one of the games or to a static landing page
  - Remove all OAuth redirect logic (bingo + trivia no longer check `NEXT_PUBLIC_PLATFORM_HUB_URL`)
  - Remove Platform Hub Vercel project entirely
- **Build time:** Unchanged (still builds each app separately)
- **Deployment:** 2 independent deployments

#### Option B: Single Vercel Project

**⚠️ Not recommended**

- Would require deploying both apps from one Vercel project
- Difficult to manage separate domains
- No performance gain
- Increased complexity

#### Option C: Subdirectories on Same Domain

**❌ Not viable**

- Next.js apps can't share the same domain easily
- Service worker scope conflicts (`/sw.js`)
- State management (`BroadcastChannel`) expects same origin

### Turbo Build Optimization

**Current:** `pnpm turbo build --filter=@joolie-boolie/bingo...`

**Post-standalone:**
```bash
# Build both games (if needed)
pnpm turbo build --filter="@joolie-boolie/{bingo,trivia}..."

# Or build individually (Vercel does this)
pnpm turbo build --filter=@joolie-boolie/bingo...
pnpm turbo build --filter=@joolie-boolie/trivia...
```

**Time savings:** None (each app still builds independently)

### Environment Variables

**Games need:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (for self-referential links, e.g., `/play`)
- `NEXT_PUBLIC_OAUTH_CLIENT_ID` (only if OAuth still enabled)
- `NEXT_PUBLIC_OAUTH_REDIRECT_URI` (only if OAuth still enabled)
- `SENTRY_ORG` (optional)
- `SENTRY_PROJECT` (optional)

**Games no longer need:**
- `NEXT_PUBLIC_BINGO_URL` (games no longer link to each other)
- `NEXT_PUBLIC_TRIVIA_URL` (games no longer link to each other)
- `NEXT_PUBLIC_PLATFORM_HUB_URL` (no OAuth)

### Root Domain Handling

**Current:** `joolie-boolie.com` → Platform Hub (game selector)

**Options for standalone:**

1. **Redirect to game:** `joolie-boolie.com → https://bingo.joolie-boolie.com`
   - Static HTML redirect
   - Simplest option

2. **Static landing page:** Host simple HTML at root
   - Vercel supports static site
   - Links to both games

3. **One game at root, other on subdomain**
   - Example: `joolie-boolie.com` = Bingo, `trivia.joolie-boolie.com` = Trivia
   - Requires separate domain config

4. **Deactivate root domain**
   - Games exist only on subdomains
   - No SEO/branding at root

### Conclusion

**Option A (separate Vercel projects) is best.** Games remain independent, deployment is simpler without platform-hub, and no architectural changes needed.

---

## 5. PWA & Service Worker Impact

### Service Worker Architecture

**Both games use Serwist with identical patterns:**

**Trivia:** `/apps/trivia/src/app/sw.ts` (168 lines)
**Bingo:** `/apps/bingo/src/app/sw.ts` (160 lines)

### Key Finding: Service Worker Avoids Auth Routes

**Critical code (both apps, lines 159-165):**

```typescript
// Auth API routes MUST bypass the service worker entirely.
// When a service worker handles a fetch via respondWith(), browsers strip
// Set-Cookie headers from the response (per the Fetch spec). This breaks
// OAuth token storage since /api/auth/token sets httpOnly cookies.
// By stopping propagation before Serwist's listener, no respondWith() is
// called, so the browser handles the request natively and preserves cookies.
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/auth/')) {
    event.stopImmediatePropagation();
    return; // Browser handles natively — Set-Cookie headers preserved
  }
});
```

This is **already implemented correctly** and means:
- Auth routes work properly with cookies
- Service worker doesn't interfere with OAuth
- No breaking changes needed

### Service Worker Caching Strategy

**Trivia caches:**
1. Question data files (CacheFirst, 7 days)
2. API responses excluding auth (NetworkFirst, 1 day)
3. Static assets (CacheFirst, 30 days)

**Bingo caches:**
1. Voice pack audio (CacheFirst, 30 days)
2. Voice manifest (NetworkFirst, 1 day)
3. Default roll sounds (CacheFirst, 30 days)
4. Other SFX (CacheFirst, 30 days)

### API Route Removal Impact

**If API routes were removed (not recommended):**
- Cache strategies would break
- `NetworkFirst` for `/api/trivia-api/questions` would fail
- Offline mode would degrade (only precache works)
- No way to refresh question data while offline

**Conclusion:** Service Worker caching is tightly coupled to API routes. Removing routes would require rewriting cache strategy.

### Standalone Impact

**ZERO impact.** Service worker runs entirely client-side. Whether games are "standalone" (no hub) or not:
- Service worker works the same
- Cache strategies unchanged
- PWA capabilities unchanged
- Offline support unchanged

---

## 6. Domain & URL Configuration

### Current Production URLs

```
Root Hub:     https://joolie-boolie.com
Bingo:        https://bingo.joolie-boolie.com
Trivia:       https://trivia.joolie-boolie.com
```

### Environment Variables (Current)

In `turbo.json` (global env):
```json
"NEXT_PUBLIC_BINGO_URL": "https://bingo.joolie-boolie.com",
"NEXT_PUBLIC_TRIVIA_URL": "https://trivia.joolie-boolie.com",
"NEXT_PUBLIC_PLATFORM_HUB_URL": "https://joolie-boolie.com",
```

### Standalone URL Changes

#### Scenario: Games remain on subdomains

**URLs:**
```
Bingo:  https://bingo.joolie-boolie.com
Trivia: https://trivia.joolie-boolie.com
Root:   https://joolie-boolie.com → redirect or landing
```

**Environment variables (remove):**
- `NEXT_PUBLIC_PLATFORM_HUB_URL` (no longer used)
- `NEXT_PUBLIC_BINGO_URL` (games don't link to each other)
- `NEXT_PUBLIC_TRIVIA_URL` (games don't link to each other)

**Environment variables (update):**
- `NEXT_PUBLIC_OAUTH_CLIENT_ID` → Remove if no OAuth
- `NEXT_PUBLIC_OAUTH_REDIRECT_URI` → Remove if no OAuth

#### Scenario: Games on different domains

**Example URLs:**
```
Bingo:  https://play-bingo.example.com
Trivia: https://play-trivia.example.com
```

**Changes:**
- Update all `NEXT_PUBLIC_APP_URL` values
- Update vercel.json domain mappings
- Redeploy both apps

### Cross-App Links

**Current:** Games link to hub for login
- `LoginButton` → redirects to `NEXT_PUBLIC_PLATFORM_HUB_URL + /login`
- Hub orchestrates OAuth

**Standalone:** No cross-app links
- Each game handles login independently (if auth enabled)
- Or: Both games allow guest-only mode (simplest)

### Middleware & Auth Redirect

**Trivia middleware.ts:**
```typescript
const { middleware } = createGameMiddleware({
  gameType: 'trivia',
  guestModeEnabled: true,
  protectedPaths: ['/play'],
  logger: createLogger({ service: 'trivia-middleware' }),
});
```

**Bingo middleware.ts:** Identical

**Impact of removing hub:**
- Middleware still works (no changes needed)
- Guest mode still works (no changes needed)
- If auth removed: `guestModeEnabled` becomes irrelevant

---

## 7. Health Check & Observability Routes

### Health Check

**Route:** `/api/health` (exists but not shown in CLAUDE.md)

**Purpose:** Uptime monitoring, deployment verification

**Impact:** Can be removed in standalone mode, but:
- Vercel deployments benefit from health checks
- Recommended to keep for monitoring

### CSP Report vs. Monitoring Tunnel

| Feature | Type | Standalone | Keep? |
|---------|------|-----------|-------|
| CSP Violations | Optional | Can remove | 🟡 Optional |
| Sentry Tunnel | Essential* | Keep if using Sentry | 🟢 Yes |

*If Sentry is used. If removing Sentry entirely, remove tunnel too.

---

## Summary Table: Static Export Viability

| Feature | Trivia | Bingo | Can Disable | Must Keep |
|---------|--------|-------|-------------|-----------|
| Server Components (home page) | ❌ Yes | ✅ No home page needs it | ❌ No | 🔴 Server required |
| API Routes (auth) | ❌ Yes | ❌ Yes | ❌ No | 🔴 Server required |
| API Routes (trivia-api proxy) | ❌ Yes | ✅ N/A | ❌ No (CORS needed) | 🔴 Server required |
| Middleware (guest mode) | ❌ Yes | ❌ Yes | ❌ No | 🔴 Server required |
| Service Worker | ❌ Yes | ❌ Yes | ⚠️ Yes (but loses offline) | 🟡 Optional |
| CSP Reporting | ❌ Yes | ❌ Yes | ✅ Yes | 🟡 Optional |
| Sentry Monitoring | ❌ Yes | ❌ Yes | ✅ Yes (remove Sentry) | 🟡 Optional |

**Verdict:** `output: 'export'` is **not possible** for either game. Both must remain SSR with Next.js API routes.

---

## Recommendations for Phase 3

### 1. Keep Current Architecture

| Component | Action |
|-----------|--------|
| Next.js SSR | ✅ Keep |
| API routes | ✅ Keep |
| Trivia-API proxy | ✅ Keep |
| Service Worker | ✅ Keep |
| Sentry integration | 🟡 Optional (monitor budget) |
| CSP reporting | 🟡 Optional |

### 2. Simplify for Standalone Games

| Change | Impact |
|--------|--------|
| Remove Platform Hub | Eliminates OAuth orchestration |
| Remove inter-game links | Simplify routing |
| Guest-mode only (optional) | Removes all auth complexity |
| Update Vercel projects | 2 instead of 3 |
| Remove auth package from games | Optional if guest-only |

### 3. Domain Configuration Options

**Option A (Recommended):**
- `bingo.example.com` → Bingo app (Vercel)
- `trivia.example.com` → Trivia app (Vercel)
- `example.com` → Static redirect or landing page

**Option B (Simpler):**
- Single domain, guest-only mode
- Example: `play.example.com` hosts both games (not recommended)

### 4. Deployment Checklist for Standalone

- [ ] Remove `NEXT_PUBLIC_PLATFORM_HUB_URL` from games
- [ ] Remove `NEXT_PUBLIC_BINGO_URL` from Trivia
- [ ] Remove `NEXT_PUBLIC_TRIVIA_URL` from Bingo
- [ ] Decide on root domain (redirect vs. landing page)
- [ ] Update Vercel environment variables
- [ ] Test OAuth callback redirect (if keeping auth)
- [ ] Test guest mode access
- [ ] Verify service worker caching works offline
- [ ] Remove Platform Hub Vercel project

---

## Questions for Decision Makers

1. **Authentication:** Keep guest-only mode or require sign-in? (affects domain count)
2. **Root domain:** What should `example.com` do? (redirect to game or landing page)
3. **Sentry budget:** Worth the cost for error tracking? (affects monitoring tunnel)
4. **Timeline:** Can infrastructure wait for Phase 3 or needed before?
5. **Backward compatibility:** Do existing game URLs need redirects?

---

## References

- Trivia config: `/apps/trivia/next.config.ts`
- Bingo config: `/apps/bingo/next.config.ts`
- Trivia API: `/apps/trivia/src/app/api/trivia-api/`
- Service Worker (Trivia): `/apps/trivia/src/app/sw.ts`
- Service Worker (Bingo): `/apps/bingo/src/app/sw.ts`
- Middleware patterns: `/apps/trivia/src/middleware.ts`, `/apps/bingo/src/middleware.ts`
- Deployment: `/apps/*/vercel.json`, `/turbo.json`

