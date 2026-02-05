-- Tighten RLS policies on game_sessions table
-- Previously, policies were overly permissive allowing any user to read/update sessions
-- Now, users can only access their own sessions via auth.uid() = user_id

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read active sessions" ON game_sessions;
DROP POLICY IF EXISTS "App validates token for updates" ON game_sessions;

-- Create new SELECT policy: users can only read their own sessions
CREATE POLICY "Users can read own sessions"
  ON game_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Create new UPDATE policy: users can only update their own sessions
CREATE POLICY "Users can update own sessions"
  ON game_sessions FOR UPDATE
  USING (auth.uid() = user_id);
