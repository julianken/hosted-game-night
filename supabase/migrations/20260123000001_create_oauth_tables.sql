-- OAuth 2.1 Server Implementation
-- Creates tables to support Platform Hub as an OAuth 2.1 authorization server

-- OAuth Clients table
CREATE TABLE oauth_clients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  consent_page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth Authorizations table
-- Stores pending authorization requests until user approves/denies
CREATE TABLE oauth_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  state TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  -- Authorization code (generated after approval)
  code TEXT,
  code_expires_at TIMESTAMPTZ,
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  approved_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Indexes for efficient queries
CREATE INDEX oauth_authorizations_user_id_idx ON oauth_authorizations(user_id);
CREATE INDEX oauth_authorizations_client_id_idx ON oauth_authorizations(client_id);
CREATE INDEX oauth_authorizations_code_idx ON oauth_authorizations(code) WHERE code IS NOT NULL;
CREATE INDEX oauth_authorizations_status_idx ON oauth_authorizations(status);
CREATE INDEX oauth_authorizations_expires_at_idx ON oauth_authorizations(expires_at);

-- Enable Row Level Security
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oauth_clients
-- Anyone can read OAuth client info (needed for login flows)
CREATE POLICY "OAuth clients are publicly readable"
ON oauth_clients
FOR SELECT
TO anon, authenticated
USING (true);

-- Only service role can insert/update/delete clients
CREATE POLICY "Service role can manage OAuth clients"
ON oauth_clients
FOR ALL
TO service_role
USING (true);

-- RLS Policies for oauth_authorizations
-- Users can only see their own authorizations
CREATE POLICY "Users can view own authorizations"
ON oauth_authorizations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role can manage all authorizations (for cleanup, token exchange, etc.)
CREATE POLICY "Service role can manage authorizations"
ON oauth_authorizations
FOR ALL
TO service_role
USING (true);

-- Insert default OAuth clients (Bingo and Trivia)
INSERT INTO oauth_clients (id, name, redirect_uris, consent_page_url) VALUES
  (
    '0d87a03a-d90a-4ccc-a46b-85fdd8d53c21'::uuid,
    'Beak Bingo',
    ARRAY['http://localhost:3000/auth/callback', 'https://bingo.beakgaming.com/auth/callback'],
    'http://localhost:3002/oauth/consent'
  ),
  (
    '0cd92ba6-459b-4c07-ab9d-b9bf9dbb1936'::uuid,
    'Beak Trivia',
    ARRAY['http://localhost:3001/auth/callback', 'https://trivia.beakgaming.com/auth/callback'],
    'http://localhost:3002/oauth/consent'
  );

-- Function to clean up expired authorizations
CREATE OR REPLACE FUNCTION cleanup_expired_authorizations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete authorizations that have expired and are still pending
  DELETE FROM oauth_authorizations
  WHERE expires_at < NOW()
    AND status = 'pending';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_authorizations() IS
'Deletes expired authorization requests that are still pending.
Schedule this to run periodically (e.g., every hour) via pg_cron or external scheduler.';
