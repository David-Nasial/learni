-- ─── Super Admin — bascule de plan pour tester chaque vue sans payer ──────────
-- Colle dans Supabase → SQL Editor → Run

alter table profiles
  add column if not exists test_plan_override text;

alter table profiles
  drop constraint if exists profiles_test_plan_override_check;
alter table profiles
  add constraint profiles_test_plan_override_check
  check (test_plan_override in ('free', 'starter', 'pro', 'autodidacte', 'teacher') or test_plan_override is null);
