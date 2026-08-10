-- ─── Conseils par examen — détail par thème (rouge/jaune) ─────────────────────
-- Colle dans Supabase → SQL Editor → Run
-- Ne s'applique qu'aux quiz complétés APRÈS cette migration — les anciens
-- résultats n'ont pas ce détail par thème (il n'était pas conservé avant).

alter table quiz_results
  add column if not exists topic_results jsonb;
