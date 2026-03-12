-- Migration: 004_retell_webhook_routing
-- Description: Add per-user Retell webhook credentials and routing fields

ALTER TABLE users ADD COLUMN IF NOT EXISTS retell_webhook_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS retell_webhook_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS retell_agent_id TEXT;

UPDATE users
SET retell_webhook_token = md5(id || random()::text || clock_timestamp()::text)
WHERE retell_webhook_token IS NULL OR btrim(retell_webhook_token) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_retell_webhook_token
  ON users(retell_webhook_token)
  WHERE retell_webhook_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_retell_agent_id
  ON users(retell_agent_id)
  WHERE retell_agent_id IS NOT NULL;

UPDATE subscriptions
SET payg_rate_pence = 20
WHERE payg_rate_pence IS NULL AND rate_pence IS NOT NULL;

INSERT INTO migrations (name, applied_at)
VALUES ('004_retell_webhook_routing', NOW())
ON CONFLICT DO NOTHING;
