-- ─── Mon Cartable — capsules audio pour les longs documents ──────────────────
-- Colle dans Supabase → SQL Editor → Run
-- Un livre long est maintenant découpé en plusieurs fichiers audio ("Partie 1,
-- 2, 3…") au lieu d'un seul fichier géant — lus à la suite automatiquement.

alter table cartable_uas
  add column if not exists audio_parts jsonb;
