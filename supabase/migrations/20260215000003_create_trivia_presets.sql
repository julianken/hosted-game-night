-- Migration: Create trivia_presets table (retroactive — table already exists in production)
-- Stores user's saved trivia game presets (quick-start configurations without questions)
-- Uses IF NOT EXISTS throughout since production already has this table.

create table if not exists public.trivia_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  rounds_count integer not null default 3,
  questions_per_round integer not null default 5,
  timer_duration integer not null default 30,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.trivia_presets is 'Saved trivia game presets for quick game setup (without questions)';
comment on column public.trivia_presets.timer_duration is 'Time in seconds for each question';

-- Enable RLS
alter table public.trivia_presets enable row level security;

-- RLS Policies (idempotent via DO block)
do $$
begin
  if not exists (select 1 from pg_policy where polrelid = 'public.trivia_presets'::regclass and polname = 'Users can view own trivia presets') then
    create policy "Users can view own trivia presets" on public.trivia_presets for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.trivia_presets'::regclass and polname = 'Users can create own trivia presets') then
    create policy "Users can create own trivia presets" on public.trivia_presets for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.trivia_presets'::regclass and polname = 'Users can update own trivia presets') then
    create policy "Users can update own trivia presets" on public.trivia_presets for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.trivia_presets'::regclass and polname = 'Users can delete own trivia presets') then
    create policy "Users can delete own trivia presets" on public.trivia_presets for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Indexes
create index if not exists trivia_presets_user_id_idx on public.trivia_presets(user_id);
create index if not exists trivia_presets_is_default_idx on public.trivia_presets(user_id, is_default) where is_default = true;

-- Constraints (idempotent via DO block)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trivia_presets_rounds_count_check') then
    alter table public.trivia_presets
      add constraint trivia_presets_rounds_count_check
      check (rounds_count >= 1 and rounds_count <= 20);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trivia_presets_questions_per_round_check') then
    alter table public.trivia_presets
      add constraint trivia_presets_questions_per_round_check
      check (questions_per_round >= 1 and questions_per_round <= 50);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trivia_presets_timer_duration_check') then
    alter table public.trivia_presets
      add constraint trivia_presets_timer_duration_check
      check (timer_duration >= 5 and timer_duration <= 300);
  end if;
end $$;
