-- Migration: Create database triggers
-- 1. Auto-create profile when user signs up
-- 2. Auto-update updated_at on any row update

-- =============================================================================
-- Updated_at trigger function (reusable)
-- =============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.handle_updated_at() is 'Automatically updates the updated_at column on row update';

-- =============================================================================
-- Apply updated_at trigger to all tables
-- =============================================================================

-- Profiles table
create trigger on_profiles_updated
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Bingo templates table
create trigger on_bingo_templates_updated
  before update on public.bingo_templates
  for each row
  execute function public.handle_updated_at();

-- Trivia templates table
create trigger on_trivia_templates_updated
  before update on public.trivia_templates
  for each row
  execute function public.handle_updated_at();

-- =============================================================================
-- Auto-create profile on user signup
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

comment on function public.handle_new_user() is 'Automatically creates a profile record when a new user signs up';

-- Trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
