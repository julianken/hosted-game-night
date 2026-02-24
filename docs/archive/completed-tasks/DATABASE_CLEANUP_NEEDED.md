# Database Cleanup Required

## Context

During manual testing of the Bingo Template Management feature (Phase 1), temporary modifications were made to the production Supabase database to facilitate testing without proper auth setup.

## Modifications Made (2026-01-22)

### 1. Row Level Security (RLS) Disabled
```sql
ALTER TABLE public.bingo_templates DISABLE ROW LEVEL SECURITY;
```

### 2. Foreign Key Constraint Removed
```sql
ALTER TABLE public.bingo_templates DROP CONSTRAINT bingo_templates_user_id_fkey;
```

### 3. Test Data Created
```sql
-- Template created for testing
INSERT INTO public.bingo_templates (id, user_id, name, pattern_id, voice_pack, auto_call_enabled, auto_call_interval, is_default)
VALUES (
  '6d647eed-cad3-42aa-9f16-2ab50db3d4c8',
  '00000000-0000-0000-0000-000000000000',
  'Four Corners Default',
  'four-corners',
  'standard',
  false,
  10000,
  true
);
```

## Required Cleanup Actions

### Step 1: Re-enable Row Level Security
```sql
ALTER TABLE public.bingo_templates ENABLE ROW LEVEL SECURITY;
```

### Step 2: Restore Foreign Key Constraint
```sql
ALTER TABLE public.bingo_templates
ADD CONSTRAINT bingo_templates_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;
```

### Step 3: Delete Test Data
```sql
DELETE FROM public.bingo_templates
WHERE user_id = '00000000-0000-0000-0000-000000000000';
```

## Verification

After cleanup, verify the table is properly secured:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'bingo_templates';
-- Should show: rowsecurity = true

-- Check foreign key constraint exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'bingo_templates'
AND constraint_type = 'FOREIGN KEY';
-- Should show: bingo_templates_user_id_fkey

-- Verify no test data remains
SELECT COUNT(*) FROM public.bingo_templates
WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- Should return: 0
```

## Impact

**Before cleanup:**
- ⚠️ Anyone can insert/update/delete templates (RLS disabled)
- ⚠️ Templates can reference non-existent users (FK constraint missing)
- ⚠️ Test data polluting production database

**After cleanup:**
- ✅ Only authenticated users can access their own templates
- ✅ Templates must reference valid profiles
- ✅ Clean production database

## Timing

These cleanup actions should be performed **immediately** as the current state is insecure for production use.

## Related Files

- Migration: `supabase/migrations/20260119000002_create_bingo_templates.sql`
- Test Results: `MANUAL_TESTING_RESULTS.md`
