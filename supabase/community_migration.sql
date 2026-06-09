-- ═══════════════════════════════════════════════════════════════════════════════
-- LearnI — Migration Communauté + Superadmin
-- Colle dans Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Étendre le rôle pour inclure superadmin ─────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'teacher', 'superadmin'));

-- ─── Étendre les plans ────────────────────────────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'starter', 'pro', 'autodidacte', 'teacher'));

-- ─── Communities ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text NOT NULL,
  description  text,
  topic        text,
  emoji        text DEFAULT '💬',
  type         text NOT NULL CHECK (type IN ('autodidacte', 'school')),
  classroom_id uuid REFERENCES classrooms(id) ON DELETE CASCADE,
  member_count int  DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ─── Community Members ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_members (
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator')),
  joined_at    timestamptz DEFAULT now(),
  PRIMARY KEY  (community_id, user_id)
);

-- ─── Community Channels ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_channels (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  emoji        text DEFAULT '#',
  type         text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'resources', 'challenges', 'leaderboard')),
  created_at   timestamptz DEFAULT now()
);

-- ─── Community Messages ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_messages (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id   uuid NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      text NOT NULL,
  file_url     text,
  file_name    text,
  created_at   timestamptz DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE communities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_channels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages  ENABLE ROW LEVEL SECURITY;

-- Communities : lecture publique pour que les gens puissent les voir avant de rejoindre
CREATE POLICY "communities_read" ON communities FOR SELECT USING (true);
CREATE POLICY "communities_insert" ON communities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Members : chacun voit les siennes + peut rejoindre
CREATE POLICY "community_members_read" ON community_members FOR SELECT USING (true);
CREATE POLICY "community_members_join" ON community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_members_leave" ON community_members FOR DELETE USING (auth.uid() = user_id);

-- Channels : lisibles par membres
CREATE POLICY "channels_read" ON community_channels FOR SELECT USING (true);
CREATE POLICY "channels_insert" ON community_channels FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Messages : lisibles par membres, écriture par membres connectés
CREATE POLICY "messages_read" ON community_messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON community_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_delete" ON community_messages FOR DELETE USING (auth.uid() = user_id);

-- ─── Communautés autodidactes pré-créées ──────────────────────────────────────
INSERT INTO communities (name, description, topic, emoji, type) VALUES
  ('Mathématiques', 'Algèbre, calcul, géométrie et plus encore.', 'math', '📐', 'autodidacte'),
  ('Sciences', 'Physique, chimie, biologie et sciences naturelles.', 'sciences', '🔬', 'autodidacte'),
  ('Informatique & IA', 'Programmation, algorithmes, intelligence artificielle.', 'informatique', '💻', 'autodidacte'),
  ('Histoire-Géographie', 'Histoire mondiale, géopolitique et géographie.', 'histoire-geo', '🌍', 'autodidacte'),
  ('Littérature & Langues', 'Français, anglais, littérature et linguistique.', 'litterature', '📚', 'autodidacte'),
  ('Droit & Économie', 'Sciences économiques, droit et politique.', 'droit-eco', '⚖️', 'autodidacte'),
  ('Arts & Culture', 'Musique, arts visuels, cinéma et culture générale.', 'arts', '🎨', 'autodidacte'),
  ('Médecine & Santé', 'Anatomie, physiologie, pharmacologie.', 'medecine', '🩺', 'autodidacte')
ON CONFLICT DO NOTHING;

-- ─── Canaux par défaut pour chaque communauté autodidacte ─────────────────────
INSERT INTO community_channels (community_id, name, description, emoji, type)
SELECT c.id, 'général', 'Discussion générale', '#', 'text' FROM communities c WHERE c.type = 'autodidacte'
ON CONFLICT DO NOTHING;

INSERT INTO community_channels (community_id, name, description, emoji, type)
SELECT c.id, 'questions', 'Pose tes questions ici', '❓', 'text' FROM communities c WHERE c.type = 'autodidacte'
ON CONFLICT DO NOTHING;

INSERT INTO community_channels (community_id, name, description, emoji, type)
SELECT c.id, 'ressources', 'Partagez vos notes et documents', '📎', 'resources' FROM communities c WHERE c.type = 'autodidacte'
ON CONFLICT DO NOTHING;

INSERT INTO community_channels (community_id, name, description, emoji, type)
SELECT c.id, 'classement', 'Voir qui est le meilleur', '🏆', 'leaderboard' FROM communities c WHERE c.type = 'autodidacte'
ON CONFLICT DO NOTHING;

INSERT INTO community_channels (community_id, name, description, emoji, type)
SELECT c.id, 'défis', 'Challenges hebdomadaires', '⚡', 'challenges' FROM communities c WHERE c.type = 'autodidacte'
ON CONFLICT DO NOTHING;
