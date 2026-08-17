-- ─── Retours utilisateurs + personnalisation de l'accueil ────────────────────
-- Colle dans Supabase → SQL Editor → Run

-- Objectif d'étude saisi pendant l'onboarding (sert à personnaliser l'accueil).
alter table profiles
  add column if not exists study_goal text;

create table if not exists public.app_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  email      text,
  kind       text not null check (kind in ('bug', 'idea', 'other')),
  message    text not null,
  rating     int  check (rating between 1 and 5),
  page       text,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_created on public.app_feedback(created_at desc);

alter table public.app_feedback enable row level security;

-- Chacun peut envoyer un retour et relire les siens.
create policy "send own feedback" on public.app_feedback
  for insert with check (auth.uid() = user_id);

create policy "read own feedback" on public.app_feedback
  for select using (auth.uid() = user_id);

-- Le Super Admin lit et traite tous les retours.
create policy "superadmin reads all feedback" on public.app_feedback
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

create policy "superadmin updates feedback" on public.app_feedback
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

grant all on public.app_feedback to authenticated;
