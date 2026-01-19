-- Migration: Create trivia_templates table
-- Stores user's saved trivia game configurations with questions

-- Create trivia_templates table
create table public.trivia_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  questions jsonb not null default '[]'::jsonb,
  rounds_count integer not null default 3,
  questions_per_round integer not null default 5,
  timer_duration integer not null default 30,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add table comment
comment on table public.trivia_templates is 'Saved trivia game configurations with question sets';

-- Add column comments for clarity on jsonb structure
comment on column public.trivia_templates.questions is 'Array of question objects: [{question: string, options: string[], correctIndex: number, category?: string}]';
comment on column public.trivia_templates.timer_duration is 'Time in seconds for each question';

-- Enable Row Level Security
alter table public.trivia_templates enable row level security;

-- RLS Policies: Users can CRUD their own templates only
create policy "Users can view their own trivia templates"
  on public.trivia_templates
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own trivia templates"
  on public.trivia_templates
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own trivia templates"
  on public.trivia_templates
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own trivia templates"
  on public.trivia_templates
  for delete
  using (auth.uid() = user_id);

-- Create indexes for faster lookups
create index trivia_templates_user_id_idx on public.trivia_templates(user_id);
create index trivia_templates_is_default_idx on public.trivia_templates(user_id, is_default) where is_default = true;

-- Add constraints for reasonable values
alter table public.trivia_templates
  add constraint trivia_templates_rounds_count_check
  check (rounds_count >= 1 and rounds_count <= 20);

alter table public.trivia_templates
  add constraint trivia_templates_questions_per_round_check
  check (questions_per_round >= 1 and questions_per_round <= 50);

alter table public.trivia_templates
  add constraint trivia_templates_timer_duration_check
  check (timer_duration >= 5 and timer_duration <= 300);

-- Validate questions is an array
alter table public.trivia_templates
  add constraint trivia_templates_questions_is_array
  check (jsonb_typeof(questions) = 'array');
