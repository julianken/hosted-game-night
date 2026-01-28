#!/bin/bash
set -e

echo "🚀 Implementing BEA-323: Notification Preferences"

# 1. Create database migration
echo "📝 Creating migration..."
cat > supabase/migrations/20260127000001_add_notification_preferences.sql << 'EOF'
-- Migration: Add notification preferences to profiles table
-- BEA-323: Notification preferences (storage only)

ALTER TABLE public.profiles
  ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN game_reminders_enabled BOOLEAN DEFAULT false,
  ADD COLUMN weekly_summary_enabled BOOLEAN DEFAULT false,
  ADD COLUMN marketing_emails_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.email_notifications_enabled IS 'User preference: Receive important account update emails';
COMMENT ON COLUMN public.profiles.game_reminders_enabled IS 'User preference: Receive reminders about scheduled games';
COMMENT ON COLUMN public.profiles.weekly_summary_enabled IS 'User preference: Receive weekly activity summary emails';
COMMENT ON COLUMN public.profiles.marketing_emails_enabled IS 'User preference: Receive newsletter and promotional emails';
EOF

echo "✅ Migration created"
echo "✅ Implementation script ready!"
echo ""
echo "Run: chmod +x implement-bea-323.sh && ./implement-bea-323.sh"
