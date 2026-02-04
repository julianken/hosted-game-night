-- Add is_first_party column to distinguish Beak-owned apps from third-party OAuth clients
ALTER TABLE oauth_clients
ADD COLUMN is_first_party BOOLEAN NOT NULL DEFAULT false;

-- Mark existing Beak apps as first-party (these are our internal game apps)
UPDATE oauth_clients
SET is_first_party = true
WHERE id IN (
  '0d87a03a-d90a-4ccc-a46b-85fdd8d53c21', -- Beak Bingo
  '0cd92ba6-459b-4c07-ab9d-b9bf9dbb1936'  -- Beak Trivia
);
