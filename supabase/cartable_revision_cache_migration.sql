-- ─── Mon Cartable — cache des séries de révision ─────────────────────────────
-- Colle dans Supabase → SQL Editor → Run
--
-- Évite de régénérer (et refacturer) une série d'exercices à chaque clic sur
-- "Réviser". Seul le bouton "Nouvelle série" déclenche une nouvelle génération.
-- ua_id est NULL pour l'examen final (série qui couvre tout le cahier).

create table if not exists public.cartable_revision_cache (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  cahier_id  uuid not null references public.cartable_cahiers(id) on delete cascade,
  ua_id      uuid references public.cartable_uas(id) on delete cascade,
  mode       text not null check (mode in ('ua', 'final')),
  language   text not null,
  result     jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_revision_cache_lookup
  on public.cartable_revision_cache (cahier_id, mode, language);

alter table public.cartable_revision_cache enable row level security;

create policy "own revision cache" on public.cartable_revision_cache
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant all on public.cartable_revision_cache to authenticated;
