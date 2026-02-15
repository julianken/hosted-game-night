-- Migration: Add preset_id and question_set_id columns to game_sessions
-- (retroactive — columns already exist in production)
-- These nullable UUID columns link game sessions to saved presets/question sets.
-- No foreign key constraints in production (intentional — presets can be deleted
-- without invalidating historical session records).

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'game_sessions' and column_name = 'preset_id'
  ) then
    alter table public.game_sessions add column preset_id uuid;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'game_sessions' and column_name = 'question_set_id'
  ) then
    alter table public.game_sessions add column question_set_id uuid;
  end if;
end $$;
