-- ─── Flashcard Sets ──────────────────────────────────────────────────────────
-- Colle dans Supabase → SQL Editor → Run

CREATE TABLE IF NOT EXISTS public.flashcard_sets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  subject     text NOT NULL DEFAULT '',        -- ex: "Psychologie", "Maths", "Histoire"
  source_text text NOT NULL DEFAULT '',        -- texte source pour régénérer
  cards       jsonb NOT NULL DEFAULT '[]',     -- [{ front, back, topic }]
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index pour charger rapidement les sets d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user ON public.flashcard_sets(user_id);

-- RLS
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own flashcard sets"
  ON public.flashcard_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own flashcard sets"
  ON public.flashcard_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own flashcard sets"
  ON public.flashcard_sets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own flashcard sets"
  ON public.flashcard_sets FOR DELETE
  USING (auth.uid() = user_id);

GRANT ALL ON public.flashcard_sets TO authenticated;
