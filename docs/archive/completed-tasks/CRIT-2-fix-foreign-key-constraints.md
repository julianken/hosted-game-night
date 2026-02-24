# CRIT-2: Restore Foreign Key Constraint on bingo_templates

**Task ID:** CRIT-2
**Priority:** CRITICAL - Data Integrity Issue
**Status:** Not Started
**Complexity:** Simple (2 points)
**Scope:** Single SQL ALTER TABLE statement

---

## Summary

Restore the foreign key constraint between `bingo_templates.user_id` and `profiles.id` that was removed during testing. Without this constraint, orphaned templates can exist with invalid `user_id` values, causing data integrity issues.

**Impact:** Data integrity violation, potential API errors when joining tables

---

## Dependencies

### Blocks (Must Complete First)
- [ ] CRIT-1: Enable RLS on bingo_templates (recommended but not strictly required)
- [ ] Clean up test data with invalid user_ids (will fail FK restoration)

###Blocked By (What This Task Blocks)
- [ ] Task 2: Template management CRUD (prevents orphaned template creation)
- [ ] Task 8: Profile deletion cascade (profiles can be safely deleted)

### Related (Non-Blocking)
- [ ] CRIT-1: Enable RLS (complementary security measure)

### Critical Path?
- [x] **Yes** - Required for data integrity before template CRUD operations

---

## Four-Level Acceptance Criteria

### Level 1: Code Changes

**Files Created:**
- `supabase/migrations/20260122000002_restore_bingo_templates_fk.sql` (~30 lines)

**Files Modified:**
- None (pure database migration)

**Key SQL Statements:**
1. Delete orphaned test records (user_id = '00000000-0000-0000-0000-000000000000')
2. Add foreign key constraint with ON DELETE CASCADE

### Level 2: Functional Outcome

**What Changes:**
- ✅ Cannot insert templates with invalid `user_id` values
- ✅ Templates are automatically deleted when user profile is deleted (CASCADE)
- ✅ Database enforces referential integrity

**What Stays the Same:**
- ✅ Existing valid templates unaffected
- ✅ Application code unchanged
- ✅ API behavior identical (for valid data)

### Level 3: Verification Commands

#### Test 1: Verify Foreign Key Exists
```sql
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'bingo_templates_user_id_fkey';
```
**Expected Output:**
```
       constraint_name        | constraint_type |   table_name    | referenced_table
------------------------------+-----------------+-----------------+------------------
 bingo_templates_user_id_fkey | f               | bingo_templates | profiles
(1 row)
```

#### Test 2: Verify No Orphaned Records
```sql
SELECT COUNT(*)
FROM public.bingo_templates bt
LEFT JOIN public.profiles p ON bt.user_id = p.id
WHERE p.id IS NULL;
```
**Expected Output:** `0` (zero orphaned records)

#### Test 3: Test Invalid Insert (Should Fail)
```sql
-- Attempt to insert template with non-existent user_id
INSERT INTO public.bingo_templates (name, user_id, config)
VALUES ('Invalid Template', 'fake-user-id', '{}');
```
**Expected Output:** Error `violates foreign key constraint "bingo_templates_user_id_fkey"`

#### Test 4: Test Cascade Delete
```sql
-- Create test user and template
INSERT INTO public.profiles (id, email) VALUES (gen_random_uuid(), 'test@example.com') RETURNING id;
-- Note the returned UUID

INSERT INTO public.bingo_templates (user_id, name, config)
VALUES ('<test-user-id>', 'Test Template', '{}');

-- Delete user (should cascade to templates)
DELETE FROM public.profiles WHERE id = '<test-user-id>';

-- Verify template was deleted
SELECT COUNT(*) FROM public.bingo_templates WHERE user_id = '<test-user-id>';
```
**Expected Output:** `0` (template cascaded deleted)

### Level 4: Regression Checks

- [ ] **Existing templates preserved:** All valid templates remain in database
- [ ] **Template count unchanged:** `SELECT COUNT(*) FROM bingo_templates;` returns same value before/after
- [ ] **API routes work:** `/api/templates` endpoints return correct data
- [ ] **No application errors:** Build succeeds with zero errors

---

## Implementation Steps (Ten-Step Template)

### Step 1: Pre-Implementation Checklist
- [ ] CRIT-1 completed (recommended)
- [ ] Database backup created
- [ ] Git working directory clean
- [ ] Branch: `git checkout -b fix/crit-2-restore-fk-constraint`

### Step 2: Read Existing Code
- [ ] Check current bingo_templates schema
- [ ] Verify profiles table exists and has primary key on `id`
- [ ] Identify orphaned records with invalid user_ids

### Step 3: Write Failing Tests (If Applicable)
**N/A** - Database constraint, verified via SQL queries

### Step 4: Implement Solution

**Query to Find Orphaned Records:**
```sql
-- First, identify what needs cleanup
SELECT bt.id, bt.user_id, bt.name
FROM public.bingo_templates bt
LEFT JOIN public.profiles p ON bt.user_id = p.id
WHERE p.id IS NULL;
```

**Create Migration File:**
`supabase/migrations/20260122000002_restore_bingo_templates_fk.sql`

```sql
-- Migration: Restore foreign key constraint on bingo_templates.user_id
-- Issue: CRIT-2
-- Date: 2026-01-22
-- Depends: profiles table with primary key on id column

-- Step 1: Clean up orphaned test records
-- Delete templates where user_id doesn't exist in profiles table
DELETE FROM public.bingo_templates
WHERE user_id IN (
  SELECT bt.user_id
  FROM public.bingo_templates bt
  LEFT JOIN public.profiles p ON bt.user_id = p.id
  WHERE p.id IS NULL
);

-- Step 2: Add foreign key constraint with cascade delete
ALTER TABLE public.bingo_templates
  ADD CONSTRAINT bingo_templates_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Step 3: Add index for performance (if not already exists)
-- Foreign key lookups are faster with an index
CREATE INDEX IF NOT EXISTS idx_bingo_templates_user_id
  ON public.bingo_templates(user_id);

-- Verification queries:
--
-- 1. Check constraint exists:
-- SELECT conname FROM pg_constraint WHERE conname = 'bingo_templates_user_id_fkey';
--
-- 2. Check no orphaned records:
-- SELECT COUNT(*) FROM bingo_templates bt
-- LEFT JOIN profiles p ON bt.user_id = p.id WHERE p.id IS NULL;
--
-- 3. Test invalid insert (should fail):
-- INSERT INTO bingo_templates (name, user_id, config) VALUES ('Test', 'fake-id', '{}');
```

### Step 5: Run Tests

**Apply Migration:**
```bash
cd supabase
supabase migration up
```

**Execute Verification Queries:**
```bash
supabase db psql

-- Run all verification commands from Level 3
```

### Step 6: Manual Verification

1. Test via Supabase Dashboard SQL Editor
2. Attempt to insert template with fake user_id (should fail)
3. Create test user, create template, delete user, verify cascade
4. Check Bingo app template loading still works

### Step 7: Code Quality Checks

- [ ] SQL syntax correct
- [ ] Migration includes cleanup step
- [ ] Includes performance index
- [ ] Comments explain purpose

### Step 8: Documentation Updates

**Update Files:**
1. `docs/DATABASE_CLEANUP_NEEDED.md` - Mark FK constraint as ✅ Fixed
2. `docs/MASTER_PLAN.md` - Update CRIT-2 status to Complete

### Step 9: Commit with Conventional Format

```bash
git add supabase/migrations/20260122000002_restore_bingo_templates_fk.sql
git add docs/DATABASE_CLEANUP_NEEDED.md
git add docs/MASTER_PLAN.md

git commit -m "feat(database): restore FK constraint on bingo_templates.user_id

- Clean up orphaned test records with invalid user_ids
- Add FOREIGN KEY constraint to profiles(id) with ON DELETE CASCADE
- Add index on user_id column for query performance
- Prevents insertion of templates with non-existent users
- Ensures data integrity between templates and profiles

Fixes CRIT-2

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 10: Create Pull Request

**PR Title:** `feat(database): restore FK constraint on bingo_templates (CRIT-2)`

**PR Body:**
See CRIT-1 example, adjust for FK constraint context.

---

## Risk Mitigation Matrix

| Risk Type | Likelihood | Impact | Mitigation Strategy | Rollback Plan |
|-----------|------------|--------|---------------------|---------------|
| **Data Loss** | Low | Medium | Only delete orphaned test records, backup first | Restore from backup |
| **Service Downtime** | Low | Low | Migration takes <1 second | Drop constraint immediately |
| **Breaking Change** | Low | Low | Only affects invalid data insertion (intended) | Drop FK constraint |
| **Performance Degradation** | Low | Low | Index added for FK lookups | Monitor query performance, drop index if needed |
| **Migration Failure** | Medium | Medium | Orphaned records prevent FK creation | Cleanup script provided in migration |

---

## Rollback Procedure

### Rollback Steps

#### Option 1: Via Migration Tool
```bash
supabase migration down 20260122000002_restore_bingo_templates_fk
```

#### Option 2: Manual SQL Rollback
```sql
-- Drop foreign key constraint
ALTER TABLE public.bingo_templates
  DROP CONSTRAINT IF EXISTS bingo_templates_user_id_fkey;

-- Drop index (optional, doesn't hurt to keep)
DROP INDEX IF EXISTS idx_bingo_templates_user_id;

-- Verify rollback
SELECT conname FROM pg_constraint WHERE conname = 'bingo_templates_user_id_fkey';
-- Expected: 0 rows
```

### When to Rollback

- [ ] Migration fails due to orphaned records (fix cleanup query)
- [ ] Performance degradation >50%
- [ ] Application breaks unexpectedly

---

## Complexity Assessment

**Score:** 2 / 10 (Simple)

**Rationale:**
- ✅ Single SQL statement (ALTER TABLE ADD CONSTRAINT)
- ✅ Standard PostgreSQL pattern
- ✅ No application code changes
- ✅ Low risk of side effects
- ⚠️ Requires cleanup of test data first

---

## Task Execution Checklist

### Pre-Execution
- [ ] Read execution plan
- [ ] Backup database
- [ ] Identify orphaned records to clean up

### During Execution
- [ ] Created migration file with cleanup + FK constraint
- [ ] Applied migration in development first
- [ ] Ran all verification queries
- [ ] Tested invalid insert (should fail)
- [ ] Tested cascade delete behavior

### Post-Execution
- [ ] All verification commands passed
- [ ] No orphaned records remain
- [ ] FK constraint exists and enforced
- [ ] Documentation updated

### Definition of Done
- [ ] ✅ Code Quality: Migration syntax correct
- [ ] ✅ Testing: All verification queries passed
- [ ] ✅ Documentation: DATABASE_CLEANUP_NEEDED.md updated
- [ ] ✅ Integration: Bingo app works correctly
- [ ] ✅ Security: Referential integrity enforced
- [ ] ✅ Acceptance Criteria: All 4 levels met

---

## Related Tasks

**Blocks:**
- Task 2: Template management CRUD
- Task 8: Profile deletion cascade

**Depends On:**
- Clean up test data (part of this migration)

**Related:**
- CRIT-1: Enable RLS (complementary security)

---

## Additional Notes

### Why ON DELETE CASCADE?

When a user profile is deleted, their templates should also be deleted (orphaned templates serve no purpose). CASCADE automates this cleanup.

**Alternatives Considered:**
- `ON DELETE SET NULL` - Would create orphaned templates (bad)
- `ON DELETE RESTRICT` - Would prevent user deletion (annoying)
- `ON DELETE CASCADE` - ✅ Clean automatic cleanup

### Foreign Key Performance

Foreign key constraints add overhead to:
- INSERT/UPDATE on bingo_templates (validates user_id exists)
- DELETE on profiles (finds and deletes related templates)

**Mitigation:** Index on `user_id` column makes lookups O(log n) instead of O(n).

---

**Last Updated:** 2026-01-22
**Next Review:** After CRIT-2 completion
