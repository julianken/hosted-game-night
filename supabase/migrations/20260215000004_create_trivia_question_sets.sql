-- Migration: Create trivia_question_sets table (retroactive — table already exists in production)
-- Stores user's saved question sets with categories for trivia games
-- Uses IF NOT EXISTS throughout since production already has this table.

create table if not exists public.trivia_question_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  questions jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  categories jsonb default '[]'::jsonb
);

comment on table public.trivia_question_sets is 'Saved question sets with categories for trivia games';
comment on column public.trivia_question_sets.questions is 'Array of question objects: [{question: string, options: string[], correctIndex: number, category?: string}]';
comment on column public.trivia_question_sets.categories is 'Array of category strings extracted from questions';

-- Enable RLS
alter table public.trivia_question_sets enable row level security;

-- RLS Policies (idempotent via DO block)
do $$
begin
  if not exists (select 1 from pg_policy where polrelid = 'public.trivia_question_sets'::regclass and polname = 'Users can view own trivia question sets') then
    create policy "Users can view own trivia question sets" on public.trivia_question_sets for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.trivia_question_sets'::regclass and polname = 'Users can create own trivia question sets') then
    create policy "Users can create own trivia question sets" on public.trivia_question_sets for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.trivia_question_sets'::regclass and polname = 'Users can update own trivia question sets') then
    create policy "Users can update own trivia question sets" on public.trivia_question_sets for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.trivia_question_sets'::regclass and polname = 'Users can delete own trivia question sets') then
    create policy "Users can delete own trivia question sets" on public.trivia_question_sets for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Indexes
create index if not exists trivia_question_sets_user_id_idx on public.trivia_question_sets(user_id);
create index if not exists trivia_question_sets_is_default_idx on public.trivia_question_sets(user_id, is_default) where is_default = true;

-- Constraints (idempotent via DO block)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trivia_question_sets_questions_is_array') then
    alter table public.trivia_question_sets
      add constraint trivia_question_sets_questions_is_array
      check (jsonb_typeof(questions) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trivia_question_sets_categories_is_array') then
    alter table public.trivia_question_sets
      add constraint trivia_question_sets_categories_is_array
      check (jsonb_typeof(categories) = 'array');
  end if;
end $$;
