-- Migration: 002_multi_tenant_support
-- Description: Add businesses and business_members tables for multi-tenancy
-- Tables: businesses, business_members, calls (updated)

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  retell_api_key TEXT, -- Can be overridden per business
  logo_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Business membership (linking users to businesses)
CREATE TABLE IF NOT EXISTS business_members (
  business_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'admin', -- admin, member, viewer
  created_at TEXT NOT NULL,
  PRIMARY KEY (business_id, user_id),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON business_members(user_id);

-- Calls updated to link to business
ALTER TABLE calls ADD COLUMN business_id TEXT;
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);

-- Record this migration
INSERT INTO migrations (name, applied_at) VALUES ('002_multi_tenant_support', datetime('now'));
