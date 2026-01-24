/**
 * Supabase Seed Data for E2E Testing
 *
 * Creates test user accounts needed for Playwright E2E tests.
 *
 * Run this in Supabase SQL Editor or via Supabase CLI:
 *   https://supabase.com/dashboard/project/YOUR_PROJECT/sql
 *
 * Or with CLI (if installed):
 *   supabase db reset --db-url YOUR_DATABASE_URL
 */

-- Create E2E test user for Playwright tests
-- Email: e2e-test@beak-gaming.test
-- Password: TestPassword123!
--
-- This uses Supabase Auth's admin API to create the user with a known password.
-- The user is created in the auth.users table with email confirmation bypassed.

DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Check if test user already exists
  SELECT id INTO test_user_id
  FROM auth.users
  WHERE email = 'e2e-test@beak-gaming.test';

  -- Only create if user doesn't exist
  IF test_user_id IS NULL THEN
    -- Insert into auth.users (Supabase's auth table)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'e2e-test@beak-gaming.test',
      -- Password: TestPassword123!
      -- This is the bcrypt hash for 'TestPassword123!' using Supabase's default bcrypt config
      -- Generated with: SELECT crypt('TestPassword123!', gen_salt('bf'))
      crypt('TestPassword123!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{}',
      '{"name": "E2E Test User"}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO test_user_id;

    -- Create profile for test user (if profiles table exists)
    INSERT INTO public.profiles (id, created_at, updated_at)
    VALUES (
      test_user_id,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Created E2E test user: e2e-test@beak-gaming.test';
  ELSE
    RAISE NOTICE 'E2E test user already exists: e2e-test@beak-gaming.test';
  END IF;
END $$;
