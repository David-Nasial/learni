-- ─── Flashcards générées depuis Mon Cartable — lien vers l'UA d'origine ───────
-- Colle dans Supabase → SQL Editor → Run
-- Permet de retrouver le jeu déjà généré pour une UA au lieu d'en recréer un.

alter table flashcard_sets
  add column if not exists ua_id uuid references cartable_uas(id) on delete set null;

create index if not exists idx_flashcard_sets_ua on public.flashcard_sets(ua_id);
