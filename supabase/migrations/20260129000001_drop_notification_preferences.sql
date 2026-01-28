-- Migration: Drop notification preferences columns from profiles table
-- Removes unused notification preference columns added in 20260128000002
-- BEA-411: Remove notification preferences system (storage-only, no email backend)

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS email_notifications_enabled,
  DROP COLUMN IF EXISTS game_reminders_enabled,
  DROP COLUMN IF EXISTS weekly_summary_enabled,
  DROP COLUMN IF EXISTS marketing_emails_enabled;
