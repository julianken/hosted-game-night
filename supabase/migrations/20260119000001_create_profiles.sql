-- Migration: Create profiles table
-- Extends auth.users with application-specific user data

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  facility_name text,
  default_game_title text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add table comment
comment on table public.profiles is 'User profiles extending auth.users with facility and branding information';

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- RLS Policies: Users can only read/update their own profile
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Create index for faster lookups
create index profiles_id_idx on public.profiles(id);
