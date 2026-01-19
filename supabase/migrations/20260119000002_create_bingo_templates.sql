-- Migration: Create bingo_templates table
-- Stores user's saved bingo game configurations

-- Create bingo_templates table
create table public.bingo_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  pattern_id text not null,
  voice_pack text not null default 'classic',
  auto_call_enabled boolean not null default false,
  auto_call_interval integer not null default 5000,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add table comment
comment on table public.bingo_templates is 'Saved bingo game configurations for quick game setup';

-- Enable Row Level Security
alter table public.bingo_templates enable row level security;

-- RLS Policies: Users can CRUD their own templates only
create policy "Users can view their own bingo templates"
  on public.bingo_templates
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own bingo templates"
  on public.bingo_templates
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bingo templates"
  on public.bingo_templates
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own bingo templates"
  on public.bingo_templates
  for delete
  using (auth.uid() = user_id);

-- Create indexes for faster lookups
create index bingo_templates_user_id_idx on public.bingo_templates(user_id);
create index bingo_templates_is_default_idx on public.bingo_templates(user_id, is_default) where is_default = true;

-- Add constraint to validate auto_call_interval is reasonable (1-30 seconds)
alter table public.bingo_templates
  add constraint bingo_templates_auto_call_interval_check
  check (auto_call_interval >= 1000 and auto_call_interval <= 30000);
