-- Migration: Fix profiles RLS and clean up legacy templates table
-- The profiles table was created without RLS in production (created via Dashboard UI).
-- The legacy templates table (0 rows) was replaced by bingo_templates + trivia_templates.

-- 1. Enable RLS on profiles (idempotent — no-op if already enabled)
alter table public.profiles enable row level security;

-- 2. Create RLS policies for profiles (matching the original migration intent)
-- Using DO block to make policy creation idempotent
do $$
begin
  if not exists (
    select 1 from pg_policy where polrelid = 'public.profiles'::regclass and polname = 'Users can view their own profile'
  ) then
    create policy "Users can view their own profile"
      on public.profiles
      for select
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policy where polrelid = 'public.profiles'::regclass and polname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
      on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policy where polrelid = 'public.profiles'::regclass and polname = 'Users can insert their own profile'
  ) then
    create policy "Users can insert their own profile"
      on public.profiles
      for insert
      with check (auth.uid() = id);
  end if;
end $$;

-- 3. Drop the legacy templates table (0 rows, replaced by bingo_templates + trivia_templates)
drop table if exists public.templates;
