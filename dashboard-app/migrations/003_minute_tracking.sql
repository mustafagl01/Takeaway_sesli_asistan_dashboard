-- Migration: 003_minute_tracking
-- Description: Add fields for minute tracking, PAYG, alerts, and billing events

-- Add new columns to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS used_minutes NUMERIC DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS alert_sent_at TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payg_rate_pence INTEGER;

-- Billing events table (tracks all billing-related actions)
CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- 'package_purchased', 'minutes_depleted', 'payg_charge', 'alert_sent'
  amount_pence INTEGER DEFAULT 0,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_events_business_id ON billing_events(business_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);

-- Add retell_api_key to users if not exists (may already exist from earlier migration)
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN retell_api_key TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Record this migration
INSERT INTO migrations (name, applied_at) VALUES ('003_minute_tracking', NOW())
ON CONFLICT DO NOTHING;
