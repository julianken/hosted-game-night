-- Migration: Restore FK constraint on bingo_templates.user_id
-- Fixes CRIT-2: Data integrity issue caused by manual FK removal
-- Related: BEA-296, docs/DATABASE_CLEANUP_NEEDED.md

-- Step 1: Clean up test data with invalid user_id before adding constraint
-- This deletes any templates with the placeholder UUID used during testing
DELETE FROM public.bingo_templates
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Step 2: Restore the foreign key constraint
-- This ensures all templates must reference a valid profile
ALTER TABLE public.bingo_templates
  ADD CONSTRAINT bingo_templates_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Verification queries (run separately to verify):
--
-- Check that constraint exists:
-- SELECT conname, conrelid::regclass, confrelid::regclass
-- FROM pg_constraint
-- WHERE conname = 'bingo_templates_user_id_fkey';
--
-- Verify no test data remains:
-- SELECT COUNT(*) FROM public.bingo_templates
-- WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- (Should return 0)
