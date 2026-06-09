-- Ajoute la colonne stripe_customer_id à profiles
-- Colle dans Supabase → SQL Editor → Run

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Index pour trouver rapidement par customer Stripe
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
