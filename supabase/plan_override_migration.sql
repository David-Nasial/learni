-- ─── Plan Override — bascule Autodidacte ↔ Pro sans frais ────────────────────
-- À exécuter dans Supabase → SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_override text CHECK (plan_override IN ('pro') OR plan_override IS NULL);

COMMENT ON COLUMN public.profiles.plan_override IS
  'Bascule temporaire réservée aux abonnés Autodidacte : quand définie à ''pro'', l''utilisateur reçoit l''accès Pro (dont Mon Cartable) au lieu de l''accès Autodidacte, sans frais supplémentaire, jusqu''à ce qu''il rebascule.';
