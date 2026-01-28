-- Remove avatar support (reversal of 20260128000001_add_avatar_support.sql)
-- BEA-412: Remove avatar upload feature (unused feature)

-- Drop avatar_url column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;

-- Drop storage RLS policies
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

-- Remove avatars storage bucket
DELETE FROM storage.buckets WHERE id = 'avatars';
