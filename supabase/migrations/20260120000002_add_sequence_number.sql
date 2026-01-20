-- Add sequence_number column to game_sessions table
-- This prevents race conditions between BroadcastChannel and database updates.
-- Clients track last sequence number and ignore stale updates.

-- Add sequence_number column
ALTER TABLE game_sessions
ADD COLUMN sequence_number BIGINT NOT NULL DEFAULT 0;

-- Create index for efficient querying
CREATE INDEX game_sessions_sequence_number_idx
ON game_sessions(sequence_number);

-- Trigger function to auto-increment sequence number on update
CREATE OR REPLACE FUNCTION increment_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment sequence number
  NEW.sequence_number = OLD.sequence_number + 1;

  -- Also update the updated_at timestamp
  NEW.updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before update
CREATE TRIGGER increment_sequence_on_update
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION increment_sequence_number();
