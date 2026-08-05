-- ─── Aide aux devoirs — tuteur IA (Pro) ───────────────────────────────────────
-- Colle dans Supabase → SQL Editor → Run

CREATE TABLE IF NOT EXISTS public.homework_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT 'Nouvelle conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.homework_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.homework_sessions(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL,
  attachment_name text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homework_sessions_user    ON public.homework_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_homework_messages_session ON public.homework_messages(session_id);

ALTER TABLE public.homework_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own homework sessions" ON public.homework_sessions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own homework messages" ON public.homework_messages
  USING (session_id IN (SELECT id FROM public.homework_sessions WHERE user_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM public.homework_sessions WHERE user_id = auth.uid()));

GRANT ALL ON public.homework_sessions TO authenticated;
GRANT ALL ON public.homework_messages TO authenticated;
