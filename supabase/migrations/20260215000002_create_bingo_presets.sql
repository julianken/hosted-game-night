-- Migration: Create bingo_presets table (retroactive — table already exists in production)
-- Stores user's saved bingo game presets (quick-start configurations)
-- Uses IF NOT EXISTS throughout since production already has this table.

create table if not exists public.bingo_presets (
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

comment on table public.bingo_presets is 'Saved bingo game presets for quick game setup';

-- Enable RLS
alter table public.bingo_presets enable row level security;

-- RLS Policies (idempotent via DO block)
do $$
begin
  if not exists (select 1 from pg_policy where polrelid = 'public.bingo_presets'::regclass and polname = 'Users can view own bingo presets') then
    create policy "Users can view own bingo presets" on public.bingo_presets for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.bingo_presets'::regclass and polname = 'Users can create own bingo presets') then
    create policy "Users can create own bingo presets" on public.bingo_presets for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.bingo_presets'::regclass and polname = 'Users can update own bingo presets') then
    create policy "Users can update own bingo presets" on public.bingo_presets for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.bingo_presets'::regclass and polname = 'Users can delete own bingo presets') then
    create policy "Users can delete own bingo presets" on public.bingo_presets for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Indexes
create index if not exists bingo_presets_user_id_idx on public.bingo_presets(user_id);
create index if not exists bingo_presets_is_default_idx on public.bingo_presets(user_id, is_default) where is_default = true;

-- Constraints (idempotent via DO block)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bingo_presets_auto_call_interval_check') then
    alter table public.bingo_presets
      add constraint bingo_presets_auto_call_interval_check
      check (auto_call_interval >= 1000 and auto_call_interval <= 30000);
  end if;
end $$;
