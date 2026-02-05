# CRIT-1: Enable Row-Level Security on bingo_templates

**Task ID:** CRIT-1
**Priority:** CRITICAL - Blocking Security Vulnerability
**Status:** Not Started
**Complexity:** Medium (4 points)
**Scope:** Database migration only, no application code changes

---

## Summary

Enable Row-Level Security (RLS) on the `bingo_templates` table to prevent unauthorized access. Currently, the table has RLS disabled, allowing any authenticated user to read/modify all templates regardless of ownership.

**Security Impact:** HIGH - Unauthenticated database access vulnerability

---

## Dependencies

### Blocks (Must Complete First)
- [x] None - Database exists and is accessible
- [x] None - Supabase console access available

### Blocked By (What This Task Blocks)
- [ ] CRIT-3: Remove test-login routes (security must be enabled before removing bypass routes)
- [ ] Task 1: User authentication flow (templates need protection)
- [ ] Task 2: Template management CRUD (API must respect ownership)
- [ ] Task 5: Extract OAuth client (users must own their data)

### Related (Non-Blocking)
- [ ] CRIT-2: Fix foreign key constraints (complementary security measure)
- [ ] CRIT-4: Fix template tests (may need adjustment after RLS)

### Critical Path?
- [x] **Yes** - Blocks 4 downstream tasks and is a CRITICAL security vulnerability

---

## Four-Level Acceptance Criteria

### Level 1: Code Changes

**Files Created:**
- `supabase/migrations/20260122000001_enable_bingo_templates_rls.sql` (~60 lines)

**Files Modified:**
- None (pure database migration)

**Key Sections:**
1. Enable RLS statement
2. SELECT policy (users can read own templates)
3. INSERT policy (users can create templates for themselves)
4. UPDATE policy (users can update own templates)
5. DELETE policy (users can delete own templates)

### Level 2: Functional Outcome

**What Changes:**
- ✅ Unauthenticated users **cannot** read any templates
- ✅ Authenticated users can **only** read templates where `user_id = auth.uid()`
- ✅ Users cannot modify templates owned by others
- ✅ Users cannot create templates with fake `user_id` values
- ✅ Database returns proper HTTP 403 Forbidden for unauthorized access

**What Stays the Same:**
- ✅ Template owners retain full CRUD access to their own templates
- ✅ API response format unchanged
- ✅ No application code changes required

### Level 3: Verification Commands

#### Test 1: Verify RLS is Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'bingo_templates';
```
**Expected Output:**
```
  tablename     | rowsecurity
-----------------+-------------
 bingo_templates | t
(1 row)
```

#### Test 2: Verify Policies Exist
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'bingo_templates'
ORDER BY policyname;
```
**Expected Output:** 4 policies
```
         policyname              |   cmd    |  roles
---------------------------------+----------+----------
 Users can delete own templates  | DELETE   | {public}
 Users can insert own templates  | INSERT   | {public}
 Users can read own templates    | SELECT   | {public}
 Users can update own templates  | UPDATE   | {public}
(4 rows)
```

#### Test 3: Verify Unauthenticated Access Denied
```bash
curl -X GET "https://twssbzlkjpfaybaxgccv.supabase.co/rest/v1/bingo_templates" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```
**Expected Output:** Empty array or 401 error
```json
[]
```

#### Test 4: Verify Authenticated User Can Read Own Templates
```bash
# First, get user token by logging in
TOKEN="<user_access_token>"

curl -X GET "https://twssbzlkjpfaybaxgccv.supabase.co/rest/v1/bingo_templates" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```
**Expected Output:** Only templates where `user_id` matches the authenticated user

#### Test 5: Verify User Cannot Read Others' Templates
```sql
-- As User A (e.g., user_id = 'aaa...')
SET request.jwt.claims.sub TO 'aaaa-aaaa-aaaa-aaaa';

SELECT * FROM bingo_templates
WHERE user_id = 'bbbb-bbbb-bbbb-bbbb';  -- User B's templates
```
**Expected Output:** 0 rows

#### Test 6: Verify User Cannot Insert with Fake user_id
```bash
TOKEN="<user_A_access_token>"  # User A's token

curl -X POST "https://twssbzlkjpfaybaxgccv.supabase.co/rest/v1/bingo_templates" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Malicious Template",
    "user_id": "bbbb-bbbb-bbbb-bbbb",  // Trying to impersonate User B
    "config": {}
  }'
```
**Expected Output:** 403 Forbidden or automatic override to `auth.uid()`

### Level 4: Regression Checks

- [ ] **Existing templates remain accessible:** Templates created before RLS don't become inaccessible
- [ ] **Template CRUD API routes work:** `/api/templates` endpoints return correct data
- [ ] **No application code breaks:** Build succeeds with zero errors
- [ ] **Performance maintained:** Query response times remain under 200ms (RLS adds minimal overhead)
- [ ] **Bingo app loads templates:** Room setup modal can load user templates

---

## Implementation Steps (Ten-Step Template)

### Step 1: Pre-Implementation Checklist
- [ ] All blocking dependencies completed (None)
- [ ] Supabase console access verified
- [ ] Database backup created (via Supabase dashboard)
- [ ] Git working directory clean (`git status`)
- [ ] Branch created: `git checkout -b fix/crit-1-enable-rls-bingo-templates`

### Step 2: Read Existing Code
- [ ] Read current table schema: `supabase/migrations/001_create_bingo_tables.sql`
- [ ] Check for existing RLS policies (should be none)
- [ ] Review any existing template-related tests
- [ ] Check `/apps/bingo/src/app/api/templates/` for API usage

### Step 3: Write Failing Tests (If Applicable)
**N/A** - This is a database migration. Verification via SQL queries.

### Step 4: Implement Solution

**Create Migration File:**
`supabase/migrations/20260122000001_enable_bingo_templates_rls.sql`

```sql
-- Migration: Enable Row-Level Security on bingo_templates
-- Issue: CRIT-1
-- Date: 2026-01-22

-- Enable RLS on the table
ALTER TABLE public.bingo_templates ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own templates
CREATE POLICY "Users can read own templates"
  ON public.bingo_templates
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert templates (with automatic user_id)
CREATE POLICY "Users can insert own templates"
  ON public.bingo_templates
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.bingo_templates
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.bingo_templates
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- Verification queries
-- Run these after migration to verify RLS is active:
--
-- 1. Check RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'bingo_templates';
--
-- 2. Check policies created:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bingo_templates';
--
-- 3. Test access (requires authenticated session):
-- SELECT * FROM bingo_templates; -- Should only return user's own templates
```

### Step 5: Run Tests

**Apply Migration:**
```bash
cd supabase
supabase migration up
```

**Execute Verification Queries:**
```bash
# Connect to database
supabase db psql

# Run Test 1: Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'bingo_templates';

# Run Test 2: Check policies exist
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bingo_templates';
```

### Step 6: Manual Verification

1. **Test via Supabase Dashboard:**
   - Log in as User A
   - Go to Table Editor → bingo_templates
   - Verify only User A's templates visible

2. **Test via API:**
   - Run curl commands from Level 3 verification
   - Test both authenticated and unauthenticated access
   - Verify 403 errors for unauthorized access

3. **Test in Bingo App:**
   - Start dev server: `pnpm dev:bingo`
   - Log in as a user
   - Navigate to /play
   - Try to create room with template
   - Verify templates load correctly

### Step 7: Code Quality Checks

- [ ] **SQL Syntax:** No syntax errors in migration file
- [ ] **Naming Conventions:** Policy names are descriptive
- [ ] **Comments:** Migration includes purpose and verification steps
- [ ] **No Secrets:** No credentials in migration file

### Step 8: Documentation Updates

**Update Files:**
1. `docs/DATABASE_CLEANUP_NEEDED.md` - Mark RLS as ✅ Fixed
2. `docs/MASTER_PLAN.md` - Update Task 1 status to Complete
3. `supabase/migrations/README.md` - Document this migration (if README exists)

**Add Inline Comments:**
- Migration file already has verification queries as comments

### Step 9: Commit with Conventional Format

```bash
git add supabase/migrations/20260122000001_enable_bingo_templates_rls.sql
git add docs/DATABASE_CLEANUP_NEEDED.md
git add docs/MASTER_PLAN.md

git commit -m "feat(database): enable RLS on bingo_templates table

- Enable row-level security on public.bingo_templates
- Add 4 RLS policies: SELECT, INSERT, UPDATE, DELETE
- Users can only access templates they own (user_id = auth.uid())
- Prevents unauthorized access to template data
- No application code changes required

Fixes CRIT-1

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 10: Create Pull Request

**PR Title:** `feat(database): enable RLS on bingo_templates (CRIT-1)`

**PR Body** (use template):
```markdown
## Summary

Enables Row-Level Security on the `bingo_templates` table to prevent unauthorized access. Currently, any authenticated user can read/modify all templates. After this change, users can only access templates they own.

## Human Summary

- Enabled Row-Level Security on bingo_templates table
- Added 4 RLS policies for SELECT, INSERT, UPDATE, DELETE operations
- Users restricted to templates where user_id matches their auth ID
- No application code changes required

## Five-Level Explanation

**Level 1 (Non-Technical):**
Think of template data like files in a shared folder. Before this change, anyone who logged in could see and change everyone's files. Now, each person can only see and change their own files. This protects user data from being viewed or modified by others.

**Level 2 (Basic Technical):**
We enabled "Row-Level Security" (RLS) in the database. RLS is a database feature that checks "who is asking?" before showing data. We added 4 rules: users can read, create, update, and delete templates - but only their own templates where the `user_id` column matches their logged-in user ID.

**Level 3 (Implementation Details):**
Applied a Supabase migration that executes `ALTER TABLE bingo_templates ENABLE ROW LEVEL SECURITY` and creates 4 policies using PostgreSQL's `CREATE POLICY` syntax. Each policy uses `auth.uid() = user_id` as the check condition. Policies cover all CRUD operations (SELECT, INSERT, UPDATE, DELETE) and use USING/WITH CHECK clauses to enforce ownership.

**Level 4 (Architecture & Tradeoffs):**
RLS is enforced at the PostgreSQL layer, meaning it protects data even if application code is bypassed. The `auth.uid()` function extracts the user ID from the JWT token automatically set by Supabase Auth. Performance impact is minimal (~5-10ms per query) as PostgreSQL optimizes RLS checks. Alternative approaches (middleware checks, application-level filtering) were rejected because they don't protect against direct database access.

**Level 5 (Deep Technical):**
PostgreSQL RLS policies are compiled into additional WHERE clauses in the query planner. The `auth.uid()` function reads from `current_setting('request.jwt.claims')::json->>'sub'`, which Supabase's PostgREST layer sets via `SET LOCAL` at the beginning of each database transaction. The USING clause filters SELECT/UPDATE/DELETE, while WITH CHECK filters INSERT/UPDATE. Policies are applied via the pg_policy catalog table and enforced by the executor. RLS checks run after normal WHERE clauses but before LIMIT/OFFSET, so pagination remains efficient.

## Changes

**Database:**
- Created migration: `20260122000001_enable_bingo_templates_rls.sql`
- Enabled RLS on `public.bingo_templates`
- Added 4 policies (SELECT, INSERT, UPDATE, DELETE)

**Documentation:**
- Updated `docs/DATABASE_CLEANUP_NEEDED.md` to mark RLS as fixed
- Updated `docs/MASTER_PLAN.md` Task 1 status

**Application Code:**
- None required (pure database-level change)

## Testing

### Manual Testing
- [x] Verified RLS enabled via `pg_tables` query
- [x] Verified 4 policies created via `pg_policies` query
- [x] Tested unauthenticated access returns empty results
- [x] Tested authenticated user can read own templates
- [x] Tested user cannot read others' templates
- [x] Tested user cannot insert with fake user_id
- [x] Tested Bingo app template loading works

### Automated Testing
- [ ] No application tests changed (database-only change)
- [ ] Build passes (`pnpm build`)

### Verification Commands
See "Level 3: Verification Commands" section in execution plan.

## Risk / Impact

**Risk Level:** Low-Medium
- **Data Loss Risk:** None (read-only migration, no data deletion)
- **Breaking Change Risk:** Medium (existing code must use authenticated sessions)
- **Performance Risk:** Low (RLS adds ~5-10ms overhead)

**Mitigation:**
- Tested in development environment first
- Database backup created before migration
- Rollback procedure documented

**Impact:**
- ✅ Security: Critical vulnerability fixed
- ✅ Privacy: User data now protected
- ⚠️ Breaking: Unauthenticated API calls will fail (intended behavior)

## Rollback Plan

If issues arise, revert with:

```sql
-- Disable RLS
ALTER TABLE public.bingo_templates DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "Users can read own templates" ON public.bingo_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.bingo_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.bingo_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.bingo_templates;
```

Or via migration:
```bash
supabase migration down 20260122000001_enable_bingo_templates_rls
```

## Notes for Reviewers

- This is a pure database change - no application code modified
- RLS enforcement happens at PostgreSQL level, not application level
- Existing templates remain in database (zero data changes)
- API routes may need adjustment to handle 403 errors gracefully
- Test by logging in as different users and verifying template isolation
```

---

## Risk Mitigation Matrix

| Risk Type | Likelihood | Impact | Mitigation Strategy | Rollback Plan |
|-----------|------------|--------|---------------------|---------------|
| **Data Loss** | Low | High | No data deletion in migration, backup created | Restore from Supabase backup |
| **Service Downtime** | Low | Medium | Migration takes <1 second, apply during low traffic | Disable RLS immediately if issues |
| **Breaking Change** | Medium | High | Test all template API routes post-migration | Revert migration via `supabase migration down` |
| **Security Gap** | Low | Critical | Peer review policies, test all access patterns | Emergency hotfix SQL script |
| **Performance Degradation** | Low | Low | RLS adds minimal overhead (~5-10ms), PostgreSQL optimizes | Disable RLS if queries timeout |
| **Integration Failure** | Medium | Medium | Test Bingo app template loading end-to-end | Revert migration and investigate API layer |

---

## Rollback Procedure

### When to Rollback

Trigger rollback if **any** of these occur:
- [ ] Template API routes return 500 errors
- [ ] Users cannot load their own templates
- [ ] Database queries timeout (>1 second)
- [ ] Data corruption detected
- [ ] Critical production bug introduced

### Rollback Steps

#### Option 1: Via Supabase Migration Tool
```bash
# Revert to previous migration
supabase migration down 20260122000001_enable_bingo_templates_rls

# Verify rollback
supabase db psql -c "SELECT rowsecurity FROM pg_tables WHERE tablename = 'bingo_templates';"
# Expected: rowsecurity = f (false)
```

#### Option 2: Manual SQL Rollback
```sql
-- Connect to database
-- Via Supabase dashboard SQL Editor

-- Step 1: Disable RLS
ALTER TABLE public.bingo_templates DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all policies
DROP POLICY IF EXISTS "Users can read own templates" ON public.bingo_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.bingo_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.bingo_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.bingo_templates;

-- Step 3: Verify rollback
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'bingo_templates';
-- Expected: rowsecurity = f

SELECT COUNT(*) FROM pg_policies WHERE tablename = 'bingo_templates';
-- Expected: 0
```

### Verification After Rollback

- [ ] RLS is disabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'bingo_templates';` returns `f`
- [ ] Policies removed: `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'bingo_templates';` returns `0`
- [ ] Templates accessible without auth (pre-RLS behavior)
- [ ] Bingo app loads templates correctly
- [ ] No database errors in logs

### Post-Rollback Actions

1. **Document the Issue:**
   - Create GitHub issue: "RLS rollback - [describe what went wrong]"
   - Tag with `bug`, `security`, `database`

2. **Root Cause Analysis:**
   - Review database logs for error messages
   - Check if policies were correctly defined
   - Verify `auth.uid()` function works in environment

3. **Fix and Retry:**
   - Address root cause (policy syntax, missing auth context, etc.)
   - Test fix in development environment
   - Re-apply migration with fix

4. **Notify Stakeholders:**
   - Update Linear issue CRIT-1 with rollback reason
   - Update MASTER_PLAN.md Task 1 status to "Blocked"

---

## Complexity Assessment

**Score:** 4 / 10 (Medium)

**Rationale:**
- ✅ Single database table affected
- ✅ Well-defined security pattern (RLS)
- ✅ No application code changes
- ⚠️ Requires understanding PostgreSQL RLS
- ⚠️ Must test authentication integration
- ⚠️ Potential for breaking existing API calls

**Similar Complexity:**
- Adding a new API route with authentication
- Creating a new database migration with indexes
- Implementing middleware validation logic

---

## Task Execution Checklist

Before marking CRIT-1 as complete, verify:

### Pre-Execution
- [ ] Read this entire execution plan
- [ ] Understand RLS concept and PostgreSQL policies
- [ ] Backup database via Supabase dashboard

### During Execution
- [ ] Created migration file with correct SQL syntax
- [ ] Applied migration in development environment first
- [ ] Ran all Level 3 verification commands
- [ ] Tested Bingo app template loading
- [ ] Updated documentation (DATABASE_CLEANUP_NEEDED.md, MASTER_PLAN.md)

### Post-Execution
- [ ] All verification commands passed
- [ ] No regression issues detected
- [ ] Commit created with proper format
- [ ] Pull request created with full template
- [ ] Rollback procedure tested in development

### Definition of Done
- [ ] ✅ Code Quality: Migration syntax correct, no SQL errors
- [ ] ✅ Testing: All verification queries return expected results
- [ ] ✅ Documentation: DATABASE_CLEANUP_NEEDED.md and MASTER_PLAN.md updated
- [ ] ✅ Integration: Bingo app loads templates correctly
- [ ] ✅ Security: Unauthorized access blocked, authorized access works
- [ ] ✅ Acceptance Criteria: All 4 levels met and verified

---

## Related Tasks

**Blocks:**
- CRIT-3: Remove test-login routes (requires security enabled first)
- Task 1: User authentication flow
- Task 2: Template management CRUD
- Task 5: Extract OAuth client

**Depends On:**
- None

**Related:**
- CRIT-2: Fix foreign key constraints (complementary security measure)
- CRIT-4: Fix template tests (may need test adjustments)

---

## Additional Notes

### Why RLS Instead of Application-Level Checks?

1. **Defense in Depth:** Even if application code is bypassed, database enforces rules
2. **Zero Trust:** Never trust client-side or middleware filters
3. **Audit Trail:** PostgreSQL logs RLS policy violations
4. **Performance:** Database engine optimizes RLS checks (faster than app-level filters)
5. **Simplicity:** Single source of truth for authorization logic

### PostgreSQL RLS Resources

- [Official PostgreSQL RLS Docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [RLS Performance Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security#performance)

### Common RLS Pitfalls to Avoid

1. ❌ **Using `current_user` instead of `auth.uid()`** - Supabase uses JWT claims, not PostgreSQL roles
2. ❌ **Forgetting USING vs WITH CHECK** - USING filters reads, WITH CHECK validates writes
3. ❌ **Overly permissive policies** - `auth.uid() IS NOT NULL` allows any authenticated user
4. ❌ **No policy for service role** - Service role bypasses RLS, use carefully

---

**Last Updated:** 2026-01-22
**Next Review:** After CRIT-1 completion
