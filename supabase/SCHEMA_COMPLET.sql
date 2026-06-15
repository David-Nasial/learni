-- ═══════════════════════════════════════════════════════════════════════════════
-- LearnI — SCHÉMA COMPLET DE LA BASE DE DONNÉES
-- Version : Production
-- Auteur  : David Nasial Basola
--
-- INSTRUCTIONS :
-- Exécute chaque section dans l'ordre dans Supabase → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════════


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÉTAPE 1 — Extensions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÉTAPE 2 — Profils utilisateurs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   text NOT NULL,
  name                    text,
  role                    text NOT NULL DEFAULT 'student'
                            CHECK (role IN ('student', 'teacher', 'superadmin')),
  plan                    text NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free', 'starter', 'pro', 'autodidacte', 'teacher')),
  class_code              text,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self" ON public.profiles
  FOR ALL USING (auth.uid() = id);

GRANT SELECT, UPDATE, INSERT, DELETE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO service_role;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÉTAPE 3 — Trigger : création automatique du profil à l'inscription
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÉTAPE 4 — Résultats de quiz
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            text NOT NULL,
  score            int  NOT NULL,
  correct          int  NOT NULL,
  total            int  NOT NULL,
  duration_seconds int  DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results_own" ON public.quiz_results
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "results_teacher" ON public.quiz_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classroom_members cm
      JOIN public.classrooms c ON c.id = cm.classroom_id
      WHERE cm.student_id = quiz_results.user_id
        AND c.teacher_id  = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_results TO authenticated;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÉTAPE 5 — Classes (mode Établissement scolaire)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.classrooms (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  code        text NOT NULL UNIQUE,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_members (
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  joined_at    timestamptz DEFAULT now(),
  PRIMARY KEY  (classroom_id, student_id)
);

ALTER TABLE public.classrooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classrooms_teacher"      ON public.classrooms FOR ALL    USING (auth.uid() = teacher_id);
CREATE POLICY "classrooms_student_read" ON public.classrooms FOR SELECT USING (true);

CREATE POLICY "members_self"    ON public.classroom_members FOR ALL    USING (auth.uid() = student_id);
CREATE POLICY "members_teacher" ON public.classroom_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_id AND c.teacher_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classrooms        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_members TO authenticated;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÉTAPE 6 — Communautés (Discord-like)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.communities (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text NOT NULL,
  description  text,
  topic        text,
  emoji        text DEFAULT '💬',
  type         text NOT NULL CHECK (type IN ('autodidacte', 'school')),
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  member_count int  DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator')),
  joined_at    timestamptz DEFAULT now(),
  PRIMARY KEY  (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_channels (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  emoji        text DEFAULT '#',
  type         text NOT NULL DEFAULT 'text'
                 CHECK (type IN ('text', 'resources', 'challenges', 'leaderboard')),
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_messages (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id uuid NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id)           ON DELETE CASCADE,
  content    text NOT NULL,
  file_url   text,
  file_name  text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.communities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "communities_read"   ON public.communities       FOR SELECT USING (true);
CREATE POLICY "communities_insert" ON public.communities       FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "community_members_read"  ON public.community_members FOR SELECT USING (true);
CREATE POLICY "community_members_join"  ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_members_leave" ON public.community_members FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "channels_read"   ON public.community_channels FOR SELECT USING (true);
CREATE POLICY "channels_insert" ON public.community_channels FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "messages_read"   ON public.community_messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON public.community_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_delete" ON public.community_messages FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_messages TO authenticated;
GRANT SELECT, INSERT ON public.communities        TO service_role;
GRANT SELECT, INSERT ON public.community_channels TO service_role;

-- Fonction pour incrémenter le nombre de membres
CREATE OR REPLACE FUNCTION increment_member_count(community_id_arg uuid)
RETURNS void AS $$
  UPDATE public.communities SET member_count = member_count + 1 WHERE id = community_id_arg;
$$ LANGUAGE sql SECURITY DEFINER;

-- Communautés autodidactes pré-créées
INSERT INTO public.communities (name, description, topic, emoji, type) VALUES
  ('Mathématiques',      'Algèbre, calcul, géométrie et plus encore.',              'math',         '📐', 'autodidacte'),
  ('Sciences',           'Physique, chimie, biologie et sciences naturelles.',       'sciences',     '🔬', 'autodidacte'),
  ('Informatique & IA',  'Programmation, algorithmes, intelligence artificielle.',   'informatique', '💻', 'autodidacte'),
  ('Histoire-Géographie','Histoire mondiale, géopolitique et géographie.',           'histoire-geo', '🌍', 'autodidacte'),
  ('Littérature & Langues','Français, anglais, littérature et linguistique.',        'litterature',  '📚', 'autodidacte'),
  ('Droit & Économie',   'Sciences économiques, droit et politique.',                'droit-eco',    '⚖️', 'autodidacte'),
  ('Arts & Culture',     'Musique, arts visuels, cinéma et culture générale.',       'arts',         '🎨', 'autodidacte'),
  ('Médecine & Santé',   'Anatomie, physiologie, pharmacologie.',                    'medecine',     '🩺', 'autodidacte')
ON CONFLICT DO NOTHING;

-- Canaux par défaut pour chaque communauté autodidacte
INSERT INTO public.community_channels (community_id, name, description, emoji, type)
SELECT id, 'général',    'Discussion générale',            '#',  'text'        FROM public.communities WHERE type = 'autodidacte' ON CONFLICT DO NOTHING;

INSERT INTO public.community_channels (community_id, name, description, emoji, type)
SELECT id, 'questions',  'Pose tes questions ici',         '❓', 'text'        FROM public.communities WHERE type = 'autodidacte' ON CONFLICT DO NOTHING;

INSERT INTO public.community_channels (community_id, name, description, emoji, type)
SELECT id, 'ressources', 'Partagez vos notes et documents','📎', 'resources'   FROM public.communities WHERE type = 'autodidacte' ON CONFLICT DO NOTHING;

INSERT INTO public.community_channels (community_id, name, description, emoji, type)
SELECT id, 'classement', 'Voir qui est le meilleur',       '🏆', 'leaderboard' FROM public.communities WHERE type = 'autodidacte' ON CONFLICT DO NOTHING;

INSERT INTO public.community_channels (community_id, name, description, emoji, type)
SELECT id, 'défis',      'Challenges hebdomadaires',       '⚡', 'challenges'  FROM public.communities WHERE type = 'autodidacte' ON CONFLICT DO NOTHING;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÉTAPE 7 — Calendrier d'étude
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.study_plans (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal       text NOT NULL,
  exam_date  date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_plan_items (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id      uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  date         date NOT NULL,
  subject      text NOT NULL,
  description  text NOT NULL,
  duration_min int  DEFAULT 30,
  done         boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.study_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_plans_own" ON public.study_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "study_plan_items_own" ON public.study_plan_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.study_plans WHERE id = plan_id AND user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plan_items TO authenticated;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÉTAPE 8 — Mes Cours (Autodidacte)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.user_courses (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         text NOT NULL,
  subject       text NOT NULL,
  level         text NOT NULL CHECK (level IN ('debutant', 'intermediaire', 'expert')),
  description   text,
  total_modules int  DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_modules (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   uuid NOT NULL REFERENCES public.user_courses(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  order_num   int  NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title     text NOT NULL,
  content   text NOT NULL,
  exercise  text,
  order_num int  NOT NULL,
  done      boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_courses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_own" ON public.user_courses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "modules_own" ON public.course_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_courses WHERE id = course_id AND user_id = auth.uid())
  );

CREATE POLICY "lessons_own" ON public.course_lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.course_modules m
      JOIN public.user_courses c ON c.id = m.course_id
      WHERE m.id = module_id AND c.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_courses   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÉTAPE 9 — Challenges de la semaine
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.challenges (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text NOT NULL,
  level        text NOT NULL CHECK (level IN ('debutant', 'intermediaire', 'expert')),
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id)  ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  content      text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

ALTER TABLE public.challenges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_read"   ON public.challenges            FOR SELECT USING (true);
CREATE POLICY "challenges_insert" ON public.challenges            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "submissions_read"  ON public.challenge_submissions FOR SELECT USING (true);
CREATE POLICY "submissions_own"   ON public.challenge_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.challenges            TO authenticated;
GRANT SELECT, INSERT ON public.challenge_submissions TO authenticated;
GRANT SELECT, INSERT ON public.challenges            TO service_role;
GRANT SELECT, INSERT ON public.challenge_submissions TO service_role;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SUPERADMIN — assignation manuelle uniquement (jamais via l'app)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- UPDATE public.profiles SET role = 'superadmin' WHERE email = 'ton@email.com';
