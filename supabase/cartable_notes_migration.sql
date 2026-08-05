-- ─── Mon Cartable — notes de l'élève (page de lecture) ────────────────────────
-- Colle dans Supabase → SQL Editor → Run
--
-- kind = 'general' : note libre sur l'UA (compréhension, résumé perso...)
-- kind = 'inline'  : note ancrée sur un passage précis du texte réécrit
--   (anchor_text = le passage sélectionné, paragraph_index = quel paragraphe)

CREATE TABLE IF NOT EXISTS public.cartable_ua_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ua_id           uuid NOT NULL REFERENCES public.cartable_uas(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('general', 'inline')),
  content         text NOT NULL,
  anchor_text     text,
  paragraph_index int,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ua_notes_ua ON public.cartable_ua_notes(ua_id);

ALTER TABLE public.cartable_ua_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ua notes" ON public.cartable_ua_notes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.cartable_ua_notes TO authenticated;
