# SECURITY AUDIT

**Document Version:** 1.0
**Audit Date:** 2026-01-22
**Auditor:** Comprehensive Platform Audit (6 Parallel Agents)
**Status:** Critical Issues Identified - Remediation Required

---

## Executive Summary

This security audit documents all known security issues discovered during the comprehensive platform review. The audit revealed **5 critical** issues that block production deployment, **5 high priority** issues that should be fixed before beta, and **6 medium priority** issues for post-beta remediation.

### Security Posture Summary

| Category | Status | Issues |
|----------|--------|--------|
| Authentication | Mostly Secure | OAuth 2.1 + PKCE implemented |
| Authorization | CRITICAL GAP | RLS disabled on key table |
| Data Protection | COMPROMISED | FK constraints removed |
| Session Security | Mostly Secure | httpOnly cookies, CSRF protection |
| Input Validation | Partial | Some routes lack validation |
| Infrastructure | Needs Work | Hardcoded URLs, missing CORS |

### Risk Rating

**Overall Risk:** HIGH - Cannot deploy to production until critical issues fixed

---

## 1. Critical Security Issues (BLOCKING)

### CRIT-1: Row Level Security Disabled on bingo_templates

**Severity:** CRITICAL
**Status:** NOT FIXED
**Location:** Supabase database - `bingo_templates` table

**Description:**
Row Level Security (RLS) has been disabled on the `bingo_templates` table, allowing any authenticated or unauthenticated user with database access to read, modify, or delete any template belonging to any user.

**Evidence:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'bingo_templates';
-- Result: rowsecurity = false
```

**Impact:**
- Any user can read all templates (data exposure)
- Any user can modify any template (data tampering)
- Any user can delete any template (data loss)
- Violates user data isolation principles

**Remediation:**
```sql
-- Step 1: Enable RLS
ALTER TABLE public.bingo_templates ENABLE ROW LEVEL SECURITY;

-- Step 2: Create policies
CREATE POLICY "Users can view own templates"
  ON public.bingo_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
  ON public.bingo_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.bingo_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.bingo_templates FOR DELETE
  USING (auth.uid() = user_id);
```

**Verification:**
```sql
-- Verify RLS enabled
SELECT rowsecurity FROM pg_tables WHERE tablename = 'bingo_templates';
-- Expected: true

-- Verify policies exist
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bingo_templates';
-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- Test unauthorized access
SET ROLE anon;
SELECT * FROM bingo_templates;
-- Expected: 0 rows or permission denied
```

---

### CRIT-2: Foreign Key Constraint Removed from user_id

**Severity:** CRITICAL
**Status:** NOT FIXED
**Location:** Supabase database - `bingo_templates` table

**Description:**
The foreign key constraint linking `bingo_templates.user_id` to `profiles.id` has been removed, allowing templates to reference non-existent users and compromising data integrity.

**Evidence:**
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'bingo_templates'
AND constraint_type = 'FOREIGN KEY';
-- Result: Empty (no FK constraint)
```

**Impact:**
- Templates can reference non-existent user IDs
- Orphaned data possible on user deletion
- Data integrity compromised
- Potential for injection attacks via user_id field

**Remediation:**
```sql
-- Step 1: Clean up any orphaned data
DELETE FROM public.bingo_templates
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Step 2: Restore FK constraint
ALTER TABLE public.bingo_templates
ADD CONSTRAINT bingo_templates_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;
```

**Verification:**
```sql
-- Verify constraint exists
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'bingo_templates' AND constraint_type = 'FOREIGN KEY';
-- Expected: bingo_templates_user_id_fkey

-- Test constraint enforcement
INSERT INTO bingo_templates (user_id, name, pattern_id)
VALUES ('00000000-0000-0000-0000-000000000000', 'Test', 'test');
-- Expected: Error - foreign key violation
```

---

### CRIT-3: Test-Login Routes Exposed (Authentication Bypass)

**Severity:** CRITICAL
**Status:** NOT FIXED
**Location:**
- `apps/bingo/src/app/api/auth/test-login/route.ts`
- `apps/bingo/src/app/test-login/page.tsx`

**Description:**
Debug/test routes for authentication bypass are present in the codebase and accessible in production builds. These routes allow setting arbitrary user sessions without proper credentials.

**Evidence:**
```
Current git status shows:
?? apps/bingo/src/app/api/auth/test-login/
?? apps/bingo/src/app/test-login/
```

**Impact:**
- Complete authentication bypass
- Attackers can impersonate any user
- No audit trail for fake sessions
- Violates principle of least privilege

**Remediation:**
```bash
# Step 1: Delete test-login directories
rm -rf apps/bingo/src/app/api/auth/test-login
rm -rf apps/bingo/src/app/test-login

# Step 2: Search for any references
grep -r "test-login" apps/

# Step 3: Remove any imports or references found

# Step 4: Verify deletion
ls apps/bingo/src/app/api/auth/test-login  # Should not exist
ls apps/bingo/src/app/test-login           # Should not exist

# Step 5: Verify build succeeds
cd apps/bingo && pnpm build
```

**Verification:**
```bash
# Routes should return 404
curl -I http://localhost:3000/api/auth/test-login
# Expected: 404 Not Found

curl -I http://localhost:3000/test-login
# Expected: 404 Not Found

# No test-login files in build
find .next -name "*test-login*"
# Expected: No results
```

---

### CRIT-4: Hardcoded Localhost URLs in Production Code

**Severity:** CRITICAL
**Status:** NOT FIXED
**Location:** `apps/platform-hub/src/app/page.tsx` (lines 55, 67)
             `apps/platform-hub/src/app/dashboard/page.tsx` (lines 60, 74)

**Description:**
Production code contains hardcoded localhost URLs that will fail in production deployment. This breaks cross-app navigation and OAuth redirects.

**Evidence:**
```typescript
// apps/platform-hub/src/app/page.tsx:55
? 'http://localhost:3000/play'

// apps/platform-hub/src/app/page.tsx:67
? 'http://localhost:3001/play'
```

**Impact:**
- Game links broken in production
- OAuth redirects fail
- Users cannot navigate between apps
- Platform Hub unusable in production

**Remediation:**
```typescript
// Before (broken):
const bingoUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000/play'
  : 'https://bingo.beakgaming.com/play';

// After (correct):
const bingoUrl = `${process.env.NEXT_PUBLIC_BINGO_URL}/play`;

// Environment variables required:
// NEXT_PUBLIC_BINGO_URL=https://bingo.beakgaming.com
// NEXT_PUBLIC_TRIVIA_URL=https://trivia.beakgaming.com
```

**Files to Update:**
1. `apps/platform-hub/src/app/page.tsx`
2. `apps/platform-hub/src/app/dashboard/page.tsx`
3. `apps/platform-hub/src/app/not-found.tsx`

**Verification:**
```bash
# No hardcoded localhost in production code
grep -r "localhost:300" apps/platform-hub/src/app/*.tsx
# Expected: No results (only in tests, docs, examples)

# Verify env vars in Vercel
vercel env ls
# Expected: NEXT_PUBLIC_BINGO_URL, NEXT_PUBLIC_TRIVIA_URL present
```

---

### CRIT-5: Math.random() Used for Security-Sensitive ID Generation

**Severity:** CRITICAL
**Status:** NOT FIXED
**Location:** `apps/bingo/src/lib/sync/offline-session.ts:34`

**Description:**
`Math.random()` is used to generate offline session IDs instead of cryptographically secure random generation. `Math.random()` is predictable and not suitable for security contexts.

**Evidence:**
```typescript
// apps/bingo/src/lib/sync/offline-session.ts
const char = chars[Math.floor(Math.random() * chars.length)];
```

**Impact:**
- Predictable session IDs
- Session hijacking possible
- Collision risk higher than necessary
- Violates secure random generation principles

**Remediation:**
```typescript
// Before (insecure):
const char = chars[Math.floor(Math.random() * chars.length)];

// After (secure):
const randomValues = crypto.getRandomValues(new Uint32Array(length));
let result = '';
for (let i = 0; i < length; i++) {
  result += chars[randomValues[i] % chars.length];
}
return result;
```

**Note:** PIN generation in `lib/session/secure-generation.ts` correctly uses `crypto.getRandomValues()`. This pattern should be applied to offline session IDs as well.

**Verification:**
```bash
# Search for Math.random in security-sensitive code
grep -r "Math.random" apps/*/src/lib/session/
grep -r "Math.random" apps/*/src/lib/sync/
# Expected: No results

# Verify crypto.getRandomValues is used
grep -r "crypto.getRandomValues" apps/*/src/lib/session/
# Expected: Results showing secure generation
```

---

## 2. High Priority Issues

### HIGH-1: PIN Hashing Uses SHA-256 (Not PBKDF2)

**Severity:** HIGH
**Status:** NOT FIXED
**Location:** `packages/database/src/pin-security.ts:2-10`

**Description:**
PIN validation uses simple SHA-256 hashing instead of a proper password hashing algorithm like PBKDF2, bcrypt, or Argon2. SHA-256 is fast, making it vulnerable to brute-force attacks.

**Current Implementation:**
```typescript
// packages/database/src/pin-security.ts
const hash = await crypto.subtle.digest('SHA-256', encoder.encode(pin + salt));
```

**Impact:**
- 4-digit PINs easily brute-forced (only 9,000 combinations)
- Rainbow table attacks possible
- Fast hash = fast cracking

**Remediation:**
```typescript
// Use PBKDF2 with high iteration count
const iterations = 100000;
const keyLength = 32;

const hash = await crypto.subtle.deriveBits(
  {
    name: 'PBKDF2',
    salt: encoder.encode(salt),
    iterations,
    hash: 'SHA-256',
  },
  await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  ),
  keyLength * 8
);
```

**Verification:**
- Hash generation takes >100ms (not instant)
- Same PIN produces different hash with different salt
- Unit tests verify correct validation

---

### HIGH-2: SESSION_TOKEN_SECRET Not Enforced at Startup

**Severity:** HIGH
**Status:** NOT FIXED
**Location:** All apps - environment variable validation

**Description:**
Apps do not verify that `SESSION_TOKEN_SECRET` environment variable is set at startup. If missing, token signing may use a default/empty value.

**Impact:**
- Tokens may be signed with weak/known secrets
- Cross-environment token acceptance possible
- Security depends on manual configuration

**Remediation:**
```typescript
// Add to each app's startup (e.g., next.config.js or layout.tsx)
if (!process.env.SESSION_TOKEN_SECRET) {
  throw new Error('SESSION_TOKEN_SECRET environment variable is required');
}

if (process.env.SESSION_TOKEN_SECRET.length < 64) {
  throw new Error('SESSION_TOKEN_SECRET must be at least 64 characters');
}
```

**Verification:**
```bash
# Remove env var and try to start
unset SESSION_TOKEN_SECRET
pnpm dev
# Expected: Error - SESSION_TOKEN_SECRET required

# Set weak secret
export SESSION_TOKEN_SECRET="short"
pnpm dev
# Expected: Error - must be 64 characters
```

---

### HIGH-3: Rate Limiting Uses In-Memory Store

**Severity:** HIGH
**Status:** NOT FIXED
**Location:** `apps/platform-hub/src/middleware/rate-limit.ts`

**Description:**
Rate limiting middleware stores request counts in memory. In a multi-instance deployment (e.g., Vercel serverless), each instance has its own counter, making rate limiting ineffective.

**Impact:**
- Rate limits easily bypassed across instances
- DoS protection ineffective
- Brute-force protection weakened

**Remediation:**
```typescript
// Use Redis or Upstash for distributed rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

// In middleware
const { success, limit, remaining } = await ratelimit.limit(ip);
if (!success) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

**Verification:**
- Deploy to multiple instances
- Send requests exceeding rate limit
- Verify all instances honor shared limit

---

### HIGH-4: CORS Not Configured

**Severity:** HIGH
**Status:** NOT FIXED
**Location:** All API routes

**Description:**
No CORS (Cross-Origin Resource Sharing) headers are configured on API routes. This could allow malicious third-party sites to make requests to the API.

**Impact:**
- XSS attacks can access API
- Third-party sites can exfiltrate data
- CSRF attacks possible without proper tokens

**Remediation:**
```typescript
// Add to next.config.js
headers: async () => [
  {
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL },
      { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      { key: 'Access-Control-Allow-Credentials', value: 'true' },
    ],
  },
],
```

**Verification:**
```bash
# Verify CORS headers present
curl -I -X OPTIONS http://localhost:3000/api/templates
# Expected: Access-Control-* headers present

# Verify cross-origin blocked
# From different origin, make fetch request
# Expected: CORS error unless origin matches
```

---

### HIGH-5: No Request Size Limits on API Routes

**Severity:** HIGH
**Status:** NOT FIXED
**Location:** All API routes

**Description:**
API routes do not enforce maximum request body size, making them vulnerable to denial-of-service attacks via large payloads.

**Impact:**
- Memory exhaustion attacks
- Server resource exhaustion
- Potential for serverless timeouts/costs

**Remediation:**
```typescript
// In API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', // Adjust as needed
    },
  },
};

// For App Router
export async function POST(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    return new Response('Payload too large', { status: 413 });
  }
  // ... process request
}
```

**Verification:**
```bash
# Create large payload
dd if=/dev/zero bs=2M count=1 | curl -X POST -d @- http://localhost:3000/api/templates
# Expected: 413 Payload Too Large
```

---

## 3. Medium Priority Issues

### MED-1: user_id Cookie Not httpOnly (False Positive)

**Severity:** INFORMATIONAL
**Status:** NOT AN ISSUE
**Location:** Cookie settings

**Explanation:**
Initial audit flagged `user_id` cookie as not being httpOnly. However, this is intentional:
- `access_token` and `refresh_token` ARE httpOnly (secure)
- `user_id` is intentionally readable by client for UX purposes
- `user_id` is a non-sensitive identifier (public UUID)
- No security impact from client access

**Verdict:** No action required.

---

### MED-2: Toast ID Generation Uses Math.random()

**Severity:** MEDIUM
**Status:** NOT FIXED
**Location:** `apps/*/src/components/ui/Toast.tsx`

**Description:**
Toast notification IDs are generated using `Math.random()`. While not security-critical, this could cause ID collisions in edge cases.

**Impact:**
- Potential toast ID collisions
- React key warnings possible
- Minor UX impact

**Remediation:**
```typescript
// Use crypto.randomUUID() instead
const id = crypto.randomUUID();
```

---

### MED-3: Console Logging in Production

**Severity:** MEDIUM
**Status:** NOT FIXED
**Location:** Various files

**Description:**
Production code contains `console.log` statements that could leak sensitive information and don't integrate with proper logging infrastructure.

**Impact:**
- No structured logging
- No log aggregation
- Potential data leakage in browser console

**Remediation:**
- Implement proper logging service (e.g., Axiom, LogTail)
- Replace console.log with structured logger
- Strip console.log in production builds

---

### MED-4: Audit Log RLS Policy References Non-Existent Columns

**Severity:** MEDIUM
**Status:** NOT FIXED
**Location:** `supabase/migrations/*_oauth_audit_log.sql`

**Description:**
RLS policies for audit log table may reference columns that don't exist, preventing admin access to audit logs.

**Impact:**
- Admins cannot read audit logs
- Security monitoring impaired
- Compliance issues

**Remediation:**
- Review RLS policies
- Fix column references
- Test admin access

---

### MED-5: Package Button Missing aria-busy Attribute

**Severity:** MEDIUM
**Status:** NOT FIXED
**Location:** `packages/ui/src/button.tsx`

**Description:**
The shared Button component in `@beak-gaming/ui` does not include `aria-busy` attribute that app-level Button implementations have.

**Impact:**
- Accessibility regression
- Screen readers don't announce loading state
- WCAG compliance issue

**Remediation:**
```typescript
// Add aria-busy to Button
<button
  aria-busy={isLoading}
  disabled={isLoading || disabled}
  // ...
>
```

---

### MED-6: Missing Security Headers

**Severity:** MEDIUM
**Status:** NOT FIXED
**Location:** Next.js configuration

**Description:**
Standard security headers (CSP, X-Frame-Options, X-Content-Type-Options) are not configured.

**Impact:**
- Clickjacking possible without X-Frame-Options
- MIME sniffing attacks possible
- XSS vectors without CSP

**Remediation:**
```javascript
// next.config.js
headers: async () => [
  {
    source: '/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
      },
    ],
  },
],
```

---

## 4. Security Testing Checklist

### 4.1 Pre-Production Checklist

#### Database Security
- [ ] RLS enabled on ALL tables with user data
- [ ] FK constraints exist on ALL user_id columns
- [ ] Policies tested for SELECT, INSERT, UPDATE, DELETE
- [ ] Anon role cannot access private data
- [ ] Service role key not exposed to client

#### Authentication
- [ ] Test-login routes deleted
- [ ] OAuth flow works end-to-end
- [ ] Tokens stored in httpOnly cookies
- [ ] CSRF protection working
- [ ] Session timeout works correctly

#### Authorization
- [ ] Users can only access their own data
- [ ] Admin routes protected
- [ ] API routes require authentication where needed
- [ ] Rate limiting effective

#### Infrastructure
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Environment variables not exposed
- [ ] No hardcoded secrets

### 4.2 Security Testing Procedures

#### Test RLS Policies
```sql
-- Test as anonymous user
SET ROLE anon;
SELECT * FROM bingo_templates;
-- Expected: 0 rows

-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub TO 'user-id-1';
SELECT * FROM bingo_templates;
-- Expected: Only templates where user_id = 'user-id-1'

-- Test cross-user access
SET request.jwt.claim.sub TO 'user-id-2';
UPDATE bingo_templates SET name = 'Hacked' WHERE user_id = 'user-id-1';
-- Expected: 0 rows affected
```

#### Test Authentication Bypass
```bash
# Try to access protected routes without auth
curl http://localhost:3000/api/templates
# Expected: 401 Unauthorized

# Try test-login routes (should not exist)
curl http://localhost:3000/api/auth/test-login
# Expected: 404 Not Found

# Try to forge JWT
curl -H "Authorization: Bearer fake.jwt.token" http://localhost:3000/api/templates
# Expected: 401 Unauthorized
```

#### Test Rate Limiting
```bash
# Send 20 requests quickly
for i in {1..20}; do
  curl -w "%{http_code}\n" -o /dev/null -s http://localhost:3002/api/oauth/token
done
# Expected: First 10 return 200/400, rest return 429
```

---

## 5. Remediation Status Tracking

| Issue ID | Severity | Description | Status | Assigned | ETA |
|----------|----------|-------------|--------|----------|-----|
| CRIT-1 | CRITICAL | RLS disabled | NOT FIXED | - | BLOCKING |
| CRIT-2 | CRITICAL | FK removed | NOT FIXED | - | BLOCKING |
| CRIT-3 | CRITICAL | Test-login routes | NOT FIXED | - | BLOCKING |
| CRIT-4 | CRITICAL | Hardcoded URLs | NOT FIXED | - | BLOCKING |
| CRIT-5 | CRITICAL | Math.random() | NOT FIXED | - | BLOCKING |
| HIGH-1 | HIGH | SHA-256 for PINs | NOT FIXED | - | Pre-Beta |
| HIGH-2 | HIGH | Token secret | NOT FIXED | - | Pre-Beta |
| HIGH-3 | HIGH | Rate limit memory | NOT FIXED | - | Pre-Beta |
| HIGH-4 | HIGH | CORS missing | NOT FIXED | - | Pre-Beta |
| HIGH-5 | HIGH | Request limits | NOT FIXED | - | Pre-Beta |
| MED-1 | INFO | user_id cookie | N/A | - | N/A |
| MED-2 | MEDIUM | Toast IDs | NOT FIXED | - | Post-Beta |
| MED-3 | MEDIUM | Console logging | NOT FIXED | - | Post-Beta |
| MED-4 | MEDIUM | Audit log RLS | NOT FIXED | - | Post-Beta |
| MED-5 | MEDIUM | aria-busy | NOT FIXED | - | Post-Beta |
| MED-6 | MEDIUM | Security headers | NOT FIXED | - | Post-Beta |

---

## 6. Appendix

### A. SQL Scripts for Remediation

See `docs/DATABASE_CLEANUP_NEEDED.md` for complete SQL scripts.

### B. Related Documentation

- `docs/MASTER_PLAN.md` - Section 5: Known Issues
- `docs/tasks/CRIT-1-enable-rls-bingo-templates.md`
- `docs/tasks/CRIT-2-fix-foreign-key-constraints.md`
- `docs/tasks/CRIT-3-remove-test-login-routes.md`
- `docs/TACTICAL_EXECUTION_FRAMEWORK.md`

### C. Security Resources

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

---

**Document Maintenance:**
- Update remediation status after each fix
- Re-audit quarterly or after major changes
- Track new issues as discovered
