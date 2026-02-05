-- Create refresh_tokens table for secure token persistence
-- Enables token rotation tracking, revocation, and reuse detection

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- IMPORTANT: Store SHA-256 hash of token, NEVER plaintext
  token_hash TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  -- NULL = not revoked
  revoked_at TIMESTAMPTZ,
  -- Token family tracking: points to the token this one was rotated to
  -- NULL = this is the current/active token in the family
  rotated_to UUID REFERENCES refresh_tokens(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by token hash (primary lookup path)
CREATE UNIQUE INDEX refresh_tokens_token_hash_idx ON refresh_tokens(token_hash);

-- Index for user's tokens (for listing/revoking user's sessions)
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);

-- Index for expired token cleanup
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- Index for client's tokens (for client-level revocation)
CREATE INDEX refresh_tokens_client_id_idx ON refresh_tokens(client_id);

-- Enable Row Level Security
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only view their own refresh tokens
CREATE POLICY "Users can view own refresh tokens"
ON refresh_tokens
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can revoke their own tokens (update revoked_at only)
CREATE POLICY "Users can revoke own refresh tokens"
ON refresh_tokens
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role can manage all tokens (for token exchange, cleanup, etc.)
CREATE POLICY "Service role can manage refresh tokens"
ON refresh_tokens
FOR ALL
TO service_role
USING (true);

-- Function to clean up expired refresh tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete tokens that have expired AND have been rotated (keeping audit trail for active families)
  DELETE FROM refresh_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days'
    AND (revoked_at IS NOT NULL OR rotated_to IS NOT NULL);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_refresh_tokens() IS
'Deletes refresh tokens that have expired and been rotated/revoked.
Keeps 7-day history for audit purposes.
Schedule via pg_cron or external scheduler.';

-- Function to revoke all tokens in a family (called on reuse detection)
CREATE OR REPLACE FUNCTION revoke_token_family(p_token_id UUID)
RETURNS INTEGER AS $$
DECLARE
  revoked_count INTEGER := 0;
  v_user_id UUID;
  v_client_id UUID;
BEGIN
  -- Get the user_id and client_id from the token
  SELECT user_id, client_id INTO v_user_id, v_client_id
  FROM refresh_tokens
  WHERE id = p_token_id;

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Revoke all tokens for this user/client combination (entire family)
  UPDATE refresh_tokens
  SET revoked_at = NOW()
  WHERE user_id = v_user_id
    AND client_id = v_client_id
    AND revoked_at IS NULL;

  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  RETURN revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_token_family(UUID) IS
'Revokes all refresh tokens for a user/client combination.
Called when token reuse is detected to invalidate the entire token family.';
