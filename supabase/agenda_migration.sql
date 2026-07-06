-- ─── Agenda Events — LearnI ──────────────────────────────────────────────────
-- À exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS agenda_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type             text NOT NULL CHECK (type IN ('exam', 'work', 'busy', 'study_slot')),
  title            text NOT NULL,
  date             date NOT NULL,
  start_time       time,
  end_time         time,
  is_recurring     boolean DEFAULT false,
  recurring_days   int[],        -- 0=Dim, 1=Lun, 2=Mar, 3=Mer, 4=Jeu, 5=Ven, 6=Sam
  recurring_end    date,
  color            text,
  created_at       timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agenda_events_select" ON agenda_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "agenda_events_insert" ON agenda_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agenda_events_update" ON agenda_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "agenda_events_delete" ON agenda_events
  FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON agenda_events TO authenticated;
