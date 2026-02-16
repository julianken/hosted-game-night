-- Tighten game_sessions RLS policies and add expired session cleanup
-- BEA-516
--
-- Problems addressed:
-- 1. UPDATE policy was auth.uid() = user_id, but audience displays
--    create sessions without a user_id. We need (user_id IS NULL) fallback.
-- 2. No DELETE policy existed at all.
-- 3. No mechanism to clean up expired sessions (860+ stale rows).
-- 4. No partial index for the cleanup query pattern.

-- =============================================================
-- 1. Fix UPDATE policy to allow unauthenticated audience displays
-- =============================================================
DROP POLICY IF EXISTS "Users can update own sessions" ON game_sessions;

CREATE POLICY "game_sessions_update_policy" ON game_sessions
  FOR UPDATE USING (
    (auth.uid() = user_id) OR (user_id IS NULL)
  );

-- =============================================================
-- 2. Add DELETE policy (owner-only)
-- =============================================================
CREATE POLICY "game_sessions_delete_policy" ON game_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================
-- 3. Cleanup function for expired sessions
-- =============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE game_sessions
  SET status = 'expired'
  WHERE expires_at < now() AND status = 'active';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- 4. Partial index for the cleanup query
-- =============================================================
-- Drop the existing non-partial index first, then create a partial one
DROP INDEX IF EXISTS game_sessions_expires_at_idx;

CREATE INDEX IF NOT EXISTS game_sessions_expires_at_idx
  ON game_sessions(expires_at)
  WHERE status = 'active';
