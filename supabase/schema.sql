-- ═══════════════════════════════════════════════════════════════════════════════
-- LearnI — Schéma Supabase
-- Colle ce script dans Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Extension UUID ───────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Un profil par utilisateur (lié à auth.users)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  role        text not null default 'student' check (role in ('student','teacher')),
  plan        text not null default 'free'    check (plan in ('free','starter','pro','autodidacte','teacher')),
  class_code  text,                   -- code de classe de l'élève (s'il a rejoint une classe)
  created_at  timestamptz default now()
);

-- ─── Quiz Results ─────────────────────────────────────────────────────────────
-- Chaque quiz complété par un utilisateur
create table if not exists quiz_results (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references profiles(id) on delete cascade,
  title            text not null,
  score            int  not null,      -- 0-100
  correct          int  not null,
  total            int  not null,
  duration_seconds int  default 0,
  created_at       timestamptz default now()
);

-- ─── Classrooms ───────────────────────────────────────────────────────────────
-- Classes créées par les enseignants
create table if not exists classrooms (
  id          uuid primary key default uuid_generate_v4(),
  teacher_id  uuid not null references profiles(id) on delete cascade,
  name        text not null,
  code        text not null unique,   -- code de 6 lettres pour rejoindre
  created_at  timestamptz default now()
);

-- ─── Classroom Members ────────────────────────────────────────────────────────
-- Élèves dans une classe
create table if not exists classroom_members (
  classroom_id uuid not null references classrooms(id) on delete cascade,
  student_id   uuid not null references profiles(id)   on delete cascade,
  joined_at    timestamptz default now(),
  primary key  (classroom_id, student_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Row Level Security (RLS) — Sécurité par ligne
-- ═══════════════════════════════════════════════════════════════════════════════

alter table profiles           enable row level security;
alter table quiz_results        enable row level security;
alter table classrooms          enable row level security;
alter table classroom_members   enable row level security;

-- Profiles : chacun voit/modifie son propre profil
create policy "profiles_self" on profiles
  for all using (auth.uid() = id);

-- Quiz results : chacun voit ses propres résultats
create policy "results_own" on quiz_results
  for all using (auth.uid() = user_id);

-- Quiz results : un enseignant peut voir les résultats de ses élèves
create policy "results_teacher" on quiz_results
  for select using (
    exists (
      select 1 from classroom_members cm
      join classrooms c on c.id = cm.classroom_id
      where cm.student_id = quiz_results.user_id
        and c.teacher_id  = auth.uid()
    )
  );

-- Classrooms : un enseignant gère ses propres classes
create policy "classrooms_teacher" on classrooms
  for all using (auth.uid() = teacher_id);

-- Classrooms : un élève peut lire une classe (pour la rejoindre par code)
create policy "classrooms_student_read" on classrooms
  for select using (true);

-- Classroom members : accès propre
create policy "members_self" on classroom_members
  for all using (auth.uid() = student_id);

-- Classroom members : l'enseignant voit ses membres
create policy "members_teacher" on classroom_members
  for select using (
    exists (
      select 1 from classrooms c
      where c.id = classroom_id and c.teacher_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- Données de test (optionnel — supprime si tu veux repartir de zéro)
-- ═══════════════════════════════════════════════════════════════════════════════
-- (Aucune donnée de test insérée — les utilisateurs se créent via l'app)

-- ═══════════════════════════════════════════════════════════════════════════════
-- LearnI — Calendrier d'étude
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS study_plans (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal        text NOT NULL,
  exam_date   date,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_plan_items (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id      uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  date         date NOT NULL,
  subject      text NOT NULL,
  description  text NOT NULL,
  duration_min int  DEFAULT 30,
  done         boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE study_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_plans_own" ON study_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "study_plan_items_own" ON study_plan_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM study_plans WHERE id = plan_id AND user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plan_items TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- LearnI — Mes Cours (Autodidacte)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_courses (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  subject      text NOT NULL,
  level        text NOT NULL CHECK (level IN ('debutant', 'intermediaire', 'expert')),
  description  text,
  total_modules int DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_modules (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   uuid NOT NULL REFERENCES user_courses(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  order_num   int  NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id   uuid NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title       text NOT NULL,
  content     text NOT NULL,
  exercise    text,
  order_num   int  NOT NULL,
  done        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE user_courses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_own"  ON user_courses   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "modules_own"  ON course_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM user_courses WHERE id = course_id AND user_id = auth.uid())
);
CREATE POLICY "lessons_own"  ON course_lessons FOR ALL USING (
  EXISTS (
    SELECT 1 FROM course_modules m
    JOIN user_courses c ON c.id = m.course_id
    WHERE m.id = module_id AND c.user_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_courses   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- LearnI — Challenges de la semaine
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS challenges (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text NOT NULL,
  level        text NOT NULL CHECK (level IN ('debutant', 'intermediaire', 'expert')),
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY  (challenge_id, user_id)
);

ALTER TABLE challenges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_read"   ON challenges            FOR SELECT USING (true);
CREATE POLICY "challenges_insert" ON challenges            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "submissions_read"  ON challenge_submissions FOR SELECT USING (true);
CREATE POLICY "submissions_own"   ON challenge_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.challenges            TO authenticated;
GRANT SELECT, INSERT ON public.challenge_submissions TO authenticated;
