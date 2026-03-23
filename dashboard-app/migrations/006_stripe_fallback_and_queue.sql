ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_default_payment_method_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_payg_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payg_billed_until TEXT;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_created_at ON subscriptions(status, created_at);
