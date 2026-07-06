-- ─── Mon Cartable ─────────────────────────────────────────────────────────────
-- Colle dans Supabase → SQL Editor → Run

-- 1. Cahiers (dossiers)
CREATE TABLE IF NOT EXISTS public.cartable_cahiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,           -- "Mathématiques"
  course_code text NOT NULL DEFAULT '', -- "MAT101" (optionnel)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Unités d'apprentissage
CREATE TABLE IF NOT EXISTS public.cartable_uas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cahier_id  uuid NOT NULL REFERENCES public.cartable_cahiers(id) ON DELETE CASCADE,
  number     int  NOT NULL,   -- 1, 2, 3…
  label      text NOT NULL DEFAULT '', -- optionnel : titre libre
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Documents téléversés dans une UA
CREATE TABLE IF NOT EXISTS public.cartable_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ua_id        uuid NOT NULL REFERENCES public.cartable_uas(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  filename     text NOT NULL,
  text_content text NOT NULL DEFAULT '',
  file_size    int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_cahiers_user    ON public.cartable_cahiers(user_id);
CREATE INDEX IF NOT EXISTS idx_uas_cahier      ON public.cartable_uas(cahier_id);
CREATE INDEX IF NOT EXISTS idx_docs_ua         ON public.cartable_documents(ua_id);

-- RLS
ALTER TABLE public.cartable_cahiers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartable_uas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartable_documents ENABLE ROW LEVEL SECURITY;

-- Cahiers
CREATE POLICY "own cahiers" ON public.cartable_cahiers
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- UAs — accès via cahier
CREATE POLICY "own uas" ON public.cartable_uas
  USING (cahier_id IN (SELECT id FROM public.cartable_cahiers WHERE user_id = auth.uid()))
  WITH CHECK (cahier_id IN (SELECT id FROM public.cartable_cahiers WHERE user_id = auth.uid()));

-- Documents
CREATE POLICY "own documents" ON public.cartable_documents
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.cartable_cahiers   TO authenticated;
GRANT ALL ON public.cartable_uas       TO authenticated;
GRANT ALL ON public.cartable_documents TO authenticated;
