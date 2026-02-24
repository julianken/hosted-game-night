# CRIT-3: Remove Test-Login Authentication Bypass Routes

**Task ID:** CRIT-3
**Priority:** CRITICAL - Security Vulnerability
**Status:** Not Started
**Complexity:** Simple (2 points)
**Scope:** Delete 2 directories, verify no references, commit

---

## Summary

Remove test-login routes from Bingo app that bypass authentication. These routes were created for development testing but represent a **critical security vulnerability** in production as they allow unauthenticated access to protected features.

**Security Impact:** CRITICAL - Authentication bypass vulnerability

---

## Dependencies

### Blocks (Must Complete First)
- [ ] CRIT-1: Enable RLS (security must be enabled before removing bypass)
- [ ] OAuth integration functional (users need real auth method)

### Blocked By (What This Task Blocks)
- [ ] Task 4: OAuth refresh token rotation (needs clean auth flow)
- [ ] Production deployment (cannot deploy with auth bypass)

### Related (Non-Blocking)
- [ ] Task 1: User authentication flow (OAuth is the real auth)

### Critical Path?
- [x] **Yes** - Blocks production deployment, critical security vulnerability

---

## Four-Level Acceptance Criteria

### Level 1: Code Changes

**Directories Deleted:**
1. `/apps/bingo/src/app/api/auth/test-login/` (API route handler)
2. `/apps/bingo/src/app/test-login/` (UI page)

**Files Deleted:**
- `apps/bingo/src/app/api/auth/test-login/route.ts`
- `apps/bingo/src/app/test-login/page.tsx`

**Files Modified:**
- None expected (unless references found)

**Total Lines Removed:** ~100-150 lines

### Level 2: Functional Outcome

**What Changes:**
- ✅ `/test-login` page returns 404 Not Found
- ✅ `/api/auth/test-login` endpoint returns 404 Not Found
- ✅ No authentication bypass routes exist
- ✅ Users must use OAuth flow for authentication

**What Stays the Same:**
- ✅ Real OAuth authentication still works
- ✅ Existing authenticated sessions unaffected
- ✅ Game functionality identical

### Level 3: Verification Commands

#### Test 1: Verify Directories Deleted
```bash
# Check if test-login directories exist
ls -la apps/bingo/src/app/api/auth/test-login 2>&1
ls -la apps/bingo/src/app/test-login 2>&1

# Expected: "No such file or directory"
```

#### Test 2: Search for References
```bash
# Search entire codebase for "test-login"
grep -r "test-login" apps/bingo/src --exclude-dir=node_modules

# Expected: No matches (or only comments/docs)

# Search for imports of test-login
grep -r "from.*test-login" apps/bingo/src
grep -r "import.*test-login" apps/bingo/src

# Expected: No matches
```

#### Test 3: Build Succeeds
```bash
cd apps/bingo
pnpm build

# Expected: Build successful with 0 errors
```

#### Test 4: Test Route Returns 404
```bash
# Start dev server
pnpm dev:bingo

# Test that test-login page is gone
curl -I http://localhost:3000/test-login
# Expected: HTTP/1.1 404 Not Found

# Test that test-login API is gone
curl -I http://localhost:3000/api/auth/test-login
# Expected: HTTP/1.1 404 Not Found
```

#### Test 5: Real OAuth Still Works
```bash
# Visit real login flow
curl -I http://localhost:3000/login
# Expected: HTTP/1.1 200 OK

# OAuth endpoints still exist
curl -I http://localhost:3002/api/oauth/authorize
# Expected: HTTP/1.1 200 OK or 302 redirect
```

### Level 4: Regression Checks

- [ ] **Real authentication works:** OAuth flow functional end-to-end
- [ ] **Existing sessions preserved:** Logged-in users stay logged in
- [ ] **Game features work:** Bingo game plays normally for authenticated users
- [ ] **Build passes:** No TypeScript errors, no import errors
- [ ] **Tests pass:** All existing tests still pass

---

## Implementation Steps (Ten-Step Template)

### Step 1: Pre-Implementation Checklist
- [ ] CRIT-1 (Enable RLS) completed
- [ ] OAuth integration verified working
- [ ] Git working directory clean
- [ ] Branch: `git checkout -b security/crit-3-remove-test-login`

### Step 2: Read Existing Code

**Files to Read:**
```bash
# Read test-login route implementation
cat apps/bingo/src/app/api/auth/test-login/route.ts

# Read test-login page
cat apps/bingo/src/app/test-login/page.tsx

# Check for any imports or references
grep -r "test-login" apps/bingo/src
```

**Expected Findings:**
- route.ts: Likely sets a fake auth cookie or session
- page.tsx: UI with "Login as Test User" button
- References: Hopefully none, but check navigation links

### Step 3: Write Failing Tests (If Applicable)

**Add Test to Verify Routes are Gone:**

Create `apps/bingo/src/app/__tests__/removed-routes.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('Security: Removed Routes', () => {
  it('test-login route should not exist', async () => {
    // This test documents that test-login was intentionally removed
    // If someone accidentally re-adds it, this test will remind them why it was removed

    const testLoginExists = await fetch('http://localhost:3000/test-login')
      .then(res => res.status !== 404)
      .catch(() => false);

    expect(testLoginExists).toBe(false);
  });

  it('test-login API should not exist', async () => {
    const apiExists = await fetch('http://localhost:3000/api/auth/test-login')
      .then(res => res.status !== 404)
      .catch(() => false);

    expect(apiExists).toBe(false);
  });
});
```

### Step 4: Implement Solution

**Action 1: Delete API Route**
```bash
rm -rf apps/bingo/src/app/api/auth/test-login/
```

**Action 2: Delete UI Page**
```bash
rm -rf apps/bingo/src/app/test-login/
```

**Action 3: Search for References**
```bash
# Find any imports
grep -r "test-login" apps/bingo/src

# If found, remove those imports/references manually
```

**Action 4: Check for Similar Issues**
```bash
# Search for other "test" auth routes
find apps/ -name "*test*auth*" -o -name "*auth*test*"

# Verify no other bypass routes exist
grep -r "bypass" apps/bingo/src
grep -r "skip.*auth" apps/bingo/src
```

### Step 5: Run Tests

```bash
cd apps/bingo

# Run test suite
pnpm test:run

# Expected: All tests pass (or new test fails if server not running)
```

### Step 6: Manual Verification

**Test 1: Start dev server and verify 404s**
```bash
pnpm dev:bingo

# In another terminal:
curl http://localhost:3000/test-login
curl http://localhost:3000/api/auth/test-login

# Both should return 404
```

**Test 2: Verify real OAuth works**
- Visit http://localhost:3000/login
- Click "Login with OAuth"
- Should redirect to platform-hub OAuth consent
- After approval, should return to Bingo authenticated

**Test 3: Verify game still works**
- Log in via OAuth
- Navigate to /play
- Create a room
- Verify game loads correctly

### Step 7: Code Quality Checks

- [ ] **No broken imports:** Build succeeds
- [ ] **No dangling references:** Grep found no matches
- [ ] **No commented code:** Deleted cleanly
- [ ] **No TODO comments:** Removed completely

### Step 8: Documentation Updates

**Update Files:**
1. `docs/DATABASE_CLEANUP_NEEDED.md` - Mark test-login as ✅ Removed
2. `docs/MASTER_PLAN.md` - Update CRIT-3 status to Complete
3. `apps/bingo/CLAUDE.md` - Update authentication section (if mentioned)

**Add Note:**
Add comment in commit explaining why removed:
```
SECURITY: Test-login routes removed as they bypass authentication.
DO NOT re-add. Use OAuth flow for all authentication.
See CRIT-3 for details.
```

### Step 9: Commit with Conventional Format

```bash
git add apps/bingo/src/app/api/auth/test-login/
git add apps/bingo/src/app/test-login/
git add docs/DATABASE_CLEANUP_NEEDED.md
git add docs/MASTER_PLAN.md
git add apps/bingo/src/app/__tests__/removed-routes.test.ts  # if created

git commit -m "security: remove test-login authentication bypass routes

CRITICAL SECURITY FIX

- Deleted /api/auth/test-login API route (authentication bypass)
- Deleted /test-login UI page (fake login interface)
- Verified no references remain in codebase
- Added test to prevent accidental re-addition
- All authentication now goes through OAuth flow

These routes were development-only and represent a critical
authentication bypass vulnerability in production.

DO NOT RE-ADD. Use OAuth for all authentication.

Fixes CRIT-3

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 10: Create Pull Request

**PR Title:** `security: remove test-login authentication bypass (CRIT-3)`

**PR Body:**
```markdown
## ⚠️ CRITICAL SECURITY FIX ⚠️

## Summary

Removes test-login routes that bypass authentication in the Bingo app. These routes were created for development testing but represent a **critical security vulnerability** as they allow unauthenticated access to protected features.

**DO NOT MERGE until:**
- [x] CRIT-1 (RLS) is deployed
- [x] OAuth integration is functional
- [x] All verification commands pass

## Human Summary

- Deleted `/api/auth/test-login` API endpoint (authentication bypass)
- Deleted `/test-login` UI page (fake login form)
- Verified no code references remaining
- All authentication now requires OAuth flow
- Added test to prevent accidental re-addition

## Five-Level Explanation

**Level 1 (Non-Technical):**
Imagine leaving a backdoor key under the mat labeled "Test Key - Do Not Use". That's what the test-login route was - a backdoor that bypassed security checks. We've removed it. Now the only way in is through the front door (OAuth authentication).

**Level 2 (Basic Technical):**
The Bingo app had special "test-login" routes that let anyone bypass authentication during development. We deleted these routes so users must log in properly using OAuth. It's like removing a master key that opens all doors - now you need the right key for each door.

**Level 3 (Implementation Details):**
Deleted two directories: `/api/auth/test-login/` (backend route handler) and `/test-login/` (frontend page). The API route likely set authentication cookies without validating credentials. Verified with grep that no other files import or reference these routes. Build and tests confirm no broken dependencies.

**Level 4 (Architecture & Tradeoffs):**
Test-login routes set authentication cookies/sessions without validating user identity. This bypassed the entire OAuth flow and Row-Level Security policies. Removal forces all authentication through the proper OAuth PKCE flow (authorize → callback → token exchange). Tradeoff: Development testing now requires running the full Platform Hub OAuth server (minor inconvenience) vs. having a production authentication bypass (critical security risk).

**Level 5 (Deep Technical):**
The route handler used Next.js API Routes with likely `res.setHeader('Set-Cookie', ...)` or Supabase `auth.signIn()` with hardcoded credentials. This violated principle of least privilege and defense in depth. With RLS enabled (CRIT-1), the database now expects `auth.uid()` from JWT tokens, which test-login would have faked. Removal ensures JWT tokens can only be issued by the OAuth server after proper PKCE validation, CSRF checks, and consent flow.

## Changes

**Deleted:**
- `apps/bingo/src/app/api/auth/test-login/route.ts` (~30 lines)
- `apps/bingo/src/app/test-login/page.tsx` (~70 lines)

**Added:**
- Test to verify routes remain deleted (`removed-routes.test.ts`)

**Updated:**
- `docs/DATABASE_CLEANUP_NEEDED.md` - Marked test-login as removed
- `docs/MASTER_PLAN.md` - Updated CRIT-3 status

**Total Impact:** -100 lines, removed critical security vulnerability

## Testing

### Manual Testing
- [x] Verified `/test-login` returns 404
- [x] Verified `/api/auth/test-login` returns 404
- [x] Verified real OAuth login works
- [x] Verified game functions normally for OAuth-authenticated users
- [x] Searched codebase for references (0 found)

### Automated Testing
- [x] Build succeeds (`pnpm build`)
- [x] All existing tests pass (`pnpm test:run`)
- [x] Added test to prevent re-addition

### Verification Commands
See "Level 3: Verification Commands" section in execution plan.

## Risk / Impact

**Risk Level:** Low (for removal, high if not removed)
- **Breaking Change Risk:** None - test-login wasn't used in production
- **Regression Risk:** Low - OAuth is the supported auth method
- **Security Risk:** ELIMINATED - authentication bypass removed

**Impact:**
- ✅ Security: Critical vulnerability eliminated
- ✅ Clean Code: Test code removed from production
- ⚠️ Development: Must use OAuth server for testing (minor inconvenience)

## Rollback Plan

**DO NOT ROLLBACK** - This is a security fix.

If OAuth login is broken and blocking development:
1. Fix OAuth integration (don't restore test-login)
2. Use OAuth login in development (Platform Hub on port 3002)
3. If absolutely necessary, create a LOCAL-ONLY test user in development database

**Never restore test-login routes.**

## Notes for Reviewers

**Security Checklist:**
- [x] Verified test-login directories completely deleted
- [x] Verified no code references remain (`grep -r "test-login"`)
- [x] Verified OAuth login still works end-to-end
- [x] Verified build succeeds with no import errors
- [x] Added test to prevent accidental re-addition

**Testing:**
- Run `curl http://localhost:3000/test-login` - should get 404
- Test OAuth login flow - should work normally
- Verify game loads for authenticated users

**Critical:**
- DO NOT merge this PR if OAuth integration is broken
- DO NOT merge this PR before CRIT-1 (RLS) is deployed
- DO NOT re-add these routes under any circumstance
```

---

## Risk Mitigation Matrix

| Risk Type | Likelihood | Impact | Mitigation Strategy | Rollback Plan |
|-----------|------------|--------|---------------------|---------------|
| **Breaking Change** | Low | Low | OAuth already integrated, test-login not used | DO NOT ROLLBACK - Fix OAuth if broken |
| **Development Disruption** | Medium | Low | Document OAuth dev setup, use Platform Hub locally | Use real OAuth in development |
| **Accidental Re-addition** | Low | Critical | Add test that fails if routes exist | PR review catches re-addition |
| **OAuth Login Broken** | Low | High | Test OAuth end-to-end before deploying | Fix OAuth, don't restore test-login |

---

## Rollback Procedure

### ⚠️ DO NOT ROLLBACK

This is a **security fix**. If authentication is broken, **fix the OAuth integration**, don't restore the vulnerability.

### If OAuth is Broken (Fix OAuth, Don't Rollback)

**Option 1: Fix OAuth Integration**
1. Verify Platform Hub is running (port 3002)
2. Check OAuth client registration in Supabase
3. Verify environment variables (CLIENT_ID, CLIENT_SECRET)
4. Test OAuth flow end-to-end

**Option 2: Create Test User in Development (Local Only)**
```sql
-- In development database only
INSERT INTO auth.users (id, email, encrypted_password)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  crypt('password123', gen_salt('bf'))
);
```

**Option 3: Use Supabase Auth Directly (Development)**
- Log in via Supabase Auth UI (not OAuth)
- Use Supabase Dashboard to create test users
- Sign in with email/password (not OAuth)

### Emergency Rollback (Last Resort)

**Only if:**
- Production is down AND
- OAuth is completely broken AND
- No other option available

```bash
git revert <commit-sha>
git push origin main --force

# Then immediately:
# 1. Fix OAuth
# 2. Re-apply CRIT-3
# 3. Deploy fixed version
```

---

## Complexity Assessment

**Score:** 2 / 10 (Simple)

**Rationale:**
- ✅ Just deleting files (no complex logic)
- ✅ No database changes
- ✅ No dependency updates
- ✅ Low risk (OAuth already works)
- ⚠️ Must verify no references remain

---

## Task Execution Checklist

### Pre-Execution
- [ ] CRIT-1 (RLS) deployed
- [ ] OAuth integration verified working
- [ ] Read execution plan fully

### During Execution
- [ ] Deleted `/api/auth/test-login/` directory
- [ ] Deleted `/test-login/` directory
- [ ] Searched for references with grep (0 found)
- [ ] Build succeeded with no errors
- [ ] Tests passed

### Post-Execution
- [ ] Both routes return 404
- [ ] OAuth login works end-to-end
- [ ] Game functions normally
- [ ] Documentation updated

### Definition of Done
- [ ] ✅ Code Quality: Files deleted cleanly, no broken imports
- [ ] ✅ Testing: 404 verified, OAuth works, tests pass
- [ ] ✅ Documentation: MASTER_PLAN and DATABASE_CLEANUP_NEEDED updated
- [ ] ✅ Integration: Build succeeds, game works
- [ ] ✅ Security: Authentication bypass eliminated
- [ ] ✅ Acceptance Criteria: All 4 levels met

---

## Related Tasks

**Blocks:**
- Task 4: OAuth refresh token rotation
- Production deployment

**Depends On:**
- CRIT-1: Enable RLS (security must be enabled first)
- OAuth integration (must have real auth method)

**Related:**
- Task 1: User authentication flow

---

## Additional Notes

### Why This is Critical

**Authentication Bypass:** Any user could access protected routes by visiting `/test-login` and clicking a button. No password, no OAuth, no verification.

**RLS Bypass:** Even with RLS enabled, test-login likely set a valid Supabase session token, bypassing all security policies.

**Production Risk:** If deployed to production, attackers could:
1. Visit `/test-login`
2. Get authenticated session
3. Access all protected features
4. Modify other users' data (without RLS)

### Similar Vulnerabilities to Check

After removing test-login, check for:
- Any routes with "test", "dev", "debug" in the name
- Any routes that accept credentials in query params
- Any routes that skip authentication middleware
- Any "admin" routes without proper authorization

```bash
# Search for potential issues
grep -r "skip.*auth" apps/
grep -r "bypass" apps/
grep -r "TESTING_MODE" apps/
find apps/ -name "*debug*" -o -name "*test*auth*"
```

---

**Last Updated:** 2026-01-22
**Next Review:** After CRIT-3 completion

**IMPORTANT:** This is a CRITICAL SECURITY FIX. Do not delay deployment.
