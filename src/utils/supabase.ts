// ─── Supabase — Client, Auth & Database ──────────────────────────────────────
//
// SETUP (à faire une seule fois) :
// 1. Va sur https://supabase.com → créer un projet gratuit
// 2. Dans ton .env, ajoute :
//      VITE_SUPABASE_URL=https://xxxxx.supabase.co
//      VITE_SUPABASE_ANON_KEY=eyJxxxxx
// 3. Dans Supabase → SQL Editor, colle et exécute le script SQL
//    qui se trouve dans /supabase/schema.sql de ce projet
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import type { QuizResult } from '../types'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Client Supabase (singleton)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, role: 'student' | 'teacher' = 'student') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } },
  })
  if (error) throw new Error(error.message)

  return data  // le profil est créé automatiquement par le trigger SQL
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

// ─── Profil utilisateur ───────────────────────────────────────────────────────

export interface Profile {
  id:         string
  email:      string
  role:       'student' | 'teacher' | 'superadmin'
  plan:       'free' | 'starter' | 'pro' | 'autodidacte' | 'teacher'
  name?:      string
  class_code?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  /** Plan réellement payé — présent seulement quand différent de `plan` (bascule Autodidacte ↔ Pro active, ou test Super Admin). */
  billed_plan?: 'free' | 'starter' | 'pro' | 'autodidacte' | 'teacher'
  /** Valeur brute de la bascule, réservée aux abonnés Autodidacte. */
  plan_override?: 'pro' | null
  /** Plan simulé par un Super Admin pour voir l'app comme un compte de ce plan (outil de test). */
  test_plan_override?: 'free' | 'starter' | 'pro' | 'autodidacte' | 'teacher' | null
  /** Présent uniquement quand `role` a été temporairement ramené à 'student' pour simuler un plan — la vraie valeur est ici. */
  true_role?: 'student' | 'teacher' | 'superadmin'
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null

  const raw = data as Profile

  // Un Super Admin qui teste un plan voit l'app EXACTEMENT comme ce plan la
  // verrait : on ramène `role` à 'student' pour désactiver les bypass superadmin
  // (badges, paywalls, sidebar…) partout où l'app lit `profile.role`/`profile.plan`.
  // Vérifié EN PREMIER pour ne jamais être court-circuité par la bascule Autodidacte.
  if (raw.role === 'superadmin' && raw.test_plan_override) {
    return { ...raw, plan: raw.test_plan_override, role: 'student', true_role: 'superadmin', billed_plan: raw.plan }
  }

  // Un abonné Autodidacte qui a activé la bascule reçoit l'accès Pro (dont Mon
  // Cartable) sans frais, tant qu'il n'est pas rebasculé — transparent pour le
  // reste de l'app puisque tout le monde lit `profile.plan`.
  if (raw.plan === 'autodidacte' && raw.plan_override === 'pro') {
    return { ...raw, plan: 'pro', billed_plan: 'autodidacte' }
  }

  return raw
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function setAutodidacteProOverride(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ plan_override: active ? 'pro' : null })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function setSuperadminTestPlan(
  userId: string, plan: 'free' | 'starter' | 'pro' | 'autodidacte' | 'teacher' | null
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ test_plan_override: plan })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}

// ─── Historique Quiz (cloud) ──────────────────────────────────────────────────

export async function saveResultToCloud(userId: string, result: QuizResult) {
  const { error } = await supabase.from('quiz_results').insert({
    user_id:          userId,
    title:            result.title,
    score:            result.score,
    correct:          result.correct,
    total:            result.total,
    duration_seconds: result.durationSeconds,
    created_at:       new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function getResultsFromCloud(userId: string): Promise<QuizResult[]> {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:              r.id as string,
    title:           r.title as string,
    score:           r.score as number,
    correct:         r.correct as number,
    total:           r.total as number,
    date:            new Date(r.created_at as string).toLocaleDateString('fr-CA'),
    durationSeconds: r.duration_seconds as number,
  }))
}

// ─── Classes (Enseignant) ─────────────────────────────────────────────────────

export interface Classroom {
  id:         string
  teacher_id: string
  name:       string
  code:       string
  created_at: string
}

export async function createClassroom(teacherId: string, name: string): Promise<Classroom> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  const { data, error } = await supabase
    .from('classrooms')
    .insert({ teacher_id: teacherId, name, code })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Classroom
}

export async function getTeacherClassrooms(teacherId: string): Promise<Classroom[]> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as Classroom[]
}

export async function joinClassroom(studentId: string, code: string) {
  // Trouver la classe par code
  const { data: classroom, error: findError } = await supabase
    .from('classrooms')
    .select('id')
    .eq('code', code.toUpperCase())
    .single()
  if (findError || !classroom) throw new Error('Code de classe invalide.')

  // Rejoindre
  const { error } = await supabase
    .from('classroom_members')
    .insert({ classroom_id: classroom.id, student_id: studentId })
  if (error && !error.message.includes('duplicate')) throw new Error(error.message)
}

export interface StudentResult {
  student_id:   string
  student_name: string
  student_email: string
  title:        string
  score:        number
  total:        number
  date:         string
}

export async function getClassroomResults(classroomId: string): Promise<StudentResult[]> {
  const { data, error } = await supabase
    .from('quiz_results')
    .select(`
      user_id,
      title,
      score,
      total,
      created_at,
      profiles:user_id (name, email)
    `)
    .in(
      'user_id',
      (await supabase
        .from('classroom_members')
        .select('student_id')
        .eq('classroom_id', classroomId)
      ).data?.map((m: { student_id: string }) => m.student_id) ?? []
    )
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []).map((r: Record<string, unknown>) => {
    const profile = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as Record<string, string> | null
    return {
      student_id:    r.user_id as string,
      student_name:  profile?.name  ?? 'Élève',
      student_email: profile?.email ?? '',
      title:         r.title as string,
      score:         r.score as number,
      total:         r.total as number,
      date:          new Date(r.created_at as string).toLocaleDateString('fr-CA'),
    }
  })
}

// ─── Tuteur IA ────────────────────────────────────────────────────────────────

export async function callTutor(
  messages: { role: 'user' | 'assistant'; content: string }[],
  mode: string,
  topic?: string
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages, mode, topic }),
    }
  )

  const data = await response.json() as { reply?: string; error?: string }
  if (data.error) throw new Error(data.error)
  if (!data.reply) throw new Error('Réponse vide du tuteur.')
  return data.reply
}

// ─── Communautés ──────────────────────────────────────────────────────────────

import type { Community, CommunityChannel, CommunityMessage } from '../types'

export async function getAutodidacteCommunities(userId: string): Promise<Community[]> {
  const [{ data: communities }, { data: memberships }] = await Promise.all([
    supabase.from('communities').select('*').eq('type', 'autodidacte').order('name'),
    supabase.from('community_members').select('community_id').eq('user_id', userId),
  ])
  const memberSet = new Set((memberships ?? []).map((m: { community_id: string }) => m.community_id))
  return (communities ?? []).map((c: unknown) => ({
    ...(c as Community),
    is_member: memberSet.has((c as Record<string, string>).id),
  }))
}

export async function getSchoolCommunity(classroomId: string): Promise<Community | null> {
  const { data } = await supabase
    .from('communities')
    .select('*')
    .eq('type', 'school')
    .eq('classroom_id', classroomId)
    .single()
  return data as Community | null
}

export async function createSchoolCommunity(classroomId: string, classroomName: string): Promise<Community> {
  const { data: community, error } = await supabase
    .from('communities')
    .insert({ name: classroomName, type: 'school', classroom_id: classroomId, emoji: '🏫', description: `Communauté de la classe ${classroomName}` })
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Créer les canaux par défaut
  await supabase.from('community_channels').insert([
    { community_id: community.id, name: 'général', emoji: '#', type: 'text', description: 'Discussion générale' },
    { community_id: community.id, name: 'questions', emoji: '❓', type: 'text', description: 'Questions aux professeurs' },
    { community_id: community.id, name: 'ressources', emoji: '📎', type: 'resources', description: 'Documents partagés par le professeur' },
  ])

  return community as Community
}

export async function joinCommunity(userId: string, communityId: string): Promise<void> {
  const { error } = await supabase
    .from('community_members')
    .insert({ community_id: communityId, user_id: userId })
  if (error && !error.message.includes('duplicate')) throw new Error(error.message)
  // Incrémenter member_count
  await supabase.rpc('increment_member_count', { community_id_arg: communityId })
}

export async function leaveCommunity(userId: string, communityId: string): Promise<void> {
  await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId)
}

export async function getCommunityChannels(communityId: string): Promise<CommunityChannel[]> {
  const { data } = await supabase
    .from('community_channels')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at')
  return (data ?? []) as CommunityChannel[]
}

export async function getChannelMessages(channelId: string): Promise<CommunityMessage[]> {
  const { data } = await supabase
    .from('community_messages')
    .select(`
      id, channel_id, user_id, content, file_url, file_name, created_at,
      profiles:user_id (name, email, role)
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(100)

  return (data ?? []).map((m: Record<string, unknown>) => {
    const profile = m.profiles as Record<string, string> | null
    return {
      id:          m.id as string,
      channel_id:  m.channel_id as string,
      user_id:     m.user_id as string,
      content:     m.content as string,
      file_url:    m.file_url as string | null,
      file_name:   m.file_name as string | null,
      created_at:  m.created_at as string,
      author_name: profile?.name ?? profile?.email?.split('@')[0] ?? 'Anonyme',
      author_role: profile?.role ?? 'student',
    }
  })
}

export async function sendMessage(
  channelId: string,
  userId: string,
  content: string,
  fileUrl?: string,
  fileName?: string
): Promise<void> {
  const { error } = await supabase.from('community_messages').insert({
    channel_id: channelId,
    user_id: userId,
    content,
    file_url: fileUrl ?? null,
    file_name: fileName ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function getCommunityLeaderboard(communityId: string): Promise<{ name: string; score: number; total: number }[]> {
  // Récupérer les membres puis leurs résultats
  const { data: members } = await supabase
    .from('community_members')
    .select('user_id')
    .eq('community_id', communityId)

  if (!members || members.length === 0) return []

  const memberIds = members.map((m: { user_id: string }) => m.user_id)

  const { data: results } = await supabase
    .from('quiz_results')
    .select('user_id, score, profiles:user_id (name, email)')
    .in('user_id', memberIds)

  if (!results) return []

  const aggregated = new Map<string, { name: string; total: number; sum: number }>()
  for (const r of results) {
    const profile = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as Record<string, string> | null
    const name = profile?.name ?? profile?.email?.split('@')[0] ?? 'Anonyme'
    const existing = aggregated.get(r.user_id)
    if (existing) {
      existing.sum += r.score as number
      existing.total += 1
    } else {
      aggregated.set(r.user_id as string, { name, sum: r.score as number, total: 1 })
    }
  }

  return (Array.from(aggregated.values())
    .map(v => ({ name: v.name, score: Math.round(v.sum / v.total), total: v.total }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)) as { name: string; score: number; total: number }[]
}

// ─── Calendrier d'étude ───────────────────────────────────────────────────────

export interface StudyPlan {
  id: string
  user_id: string
  goal: string
  exam_date: string | null
  created_at: string
}

export interface StudyPlanItem {
  id: string
  plan_id: string
  date: string
  subject: string
  description: string
  duration_min: number
  done: boolean
}

export async function getStudyPlan(userId: string): Promise<{ plan: StudyPlan; items: StudyPlanItem[] } | null> {
  const { data: plans } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!plans || plans.length === 0) return null
  const plan = plans[0] as StudyPlan

  const { data: items } = await supabase
    .from('study_plan_items')
    .select('*')
    .eq('plan_id', plan.id)
    .order('date', { ascending: true })

  return { plan, items: (items ?? []) as StudyPlanItem[] }
}

export async function toggleStudyItem(itemId: string, done: boolean): Promise<void> {
  await supabase.from('study_plan_items').update({ done }).eq('id', itemId)
}

export async function deleteStudyPlan(planId: string): Promise<void> {
  await supabase.from('study_plans').delete().eq('id', planId)
}

// ─── Mes Cours ────────────────────────────────────────────────────────────────

export interface UserCourse {
  id: string
  user_id: string
  title: string
  subject: string
  level: 'debutant' | 'intermediaire' | 'expert'
  description: string
  total_modules: number
  created_at: string
}

export interface CourseModule {
  id: string
  course_id: string
  title: string
  description: string
  order_num: number
}

export interface CourseLesson {
  id: string
  module_id: string
  title: string
  content: string
  exercise: string
  order_num: number
  done: boolean
}

export async function getAssessmentQuestions(subject: string): Promise<{ questions: unknown[] }> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-course`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ subject, action: 'assess' }),
    }
  )
  if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`)
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  if (!Array.isArray(data.questions)) throw new Error('Format de réponse invalide.')
  // Nettoyer les questions pour s'assurer que choices est toujours un tableau
  const questions = data.questions.map((q: Record<string, unknown>) => ({
    question:    q.question   ?? '',
    choices:     Array.isArray(q.choices) ? q.choices : [],
    answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : 0,
    level:       q.level ?? 'debutant',
  }))
  return { questions }
}

async function callGenerateCourse(body: Record<string, unknown>): Promise<{
  title: string; description: string
  modules: { title: string; description: string; order_num: number; lessons: Record<string, unknown>[] }[]
}> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-course`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }
  )
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data
}

async function saveGeneratedCourse(
  userId: string,
  subject: string,
  level: 'debutant' | 'intermediaire' | 'expert',
  data: { title: string; description: string; modules: { title: string; description: string; order_num: number; lessons: Record<string, unknown>[] }[] }
): Promise<UserCourse> {
  // Sauvegarder le cours
  const { data: course, error: courseError } = await supabase
    .from('user_courses')
    .insert({ user_id: userId, title: data.title, subject, level, description: data.description, total_modules: data.modules.length })
    .select().single()
  if (courseError) throw new Error(courseError.message)

  // Sauvegarder les modules et leçons
  for (const mod of data.modules) {
    const { data: module, error: modError } = await supabase
      .from('course_modules')
      .insert({ course_id: course.id, title: mod.title, description: mod.description, order_num: mod.order_num })
      .select().single()
    if (modError) continue

    if (mod.lessons?.length) {
      await supabase.from('course_lessons').insert(
        mod.lessons.map((l: Record<string, unknown>) => ({
          module_id: module.id, title: l.title, content: l.content,
          exercise: l.exercise, order_num: l.order_num, done: false,
        }))
      )
    }
  }

  return course as UserCourse
}

export async function generateAndSaveCourse(
  userId: string,
  subject: string,
  level: 'debutant' | 'intermediaire' | 'expert'
): Promise<UserCourse> {
  const data = await callGenerateCourse({ subject, level, action: 'generate' })
  return saveGeneratedCourse(userId, subject, level, data)
}

export async function generateAndSaveCourseFromDocument(
  userId: string,
  documentText: string,
  subject: string
): Promise<UserCourse> {
  const data = await callGenerateCourse({ documentText, subject, action: 'from_document' })
  // Pas d'évaluation de niveau pour un cours téléversé — niveau neutre par défaut
  return saveGeneratedCourse(userId, subject || data.title, 'intermediaire', data)
}

export async function getUserCourses(userId: string): Promise<UserCourse[]> {
  const { data } = await supabase
    .from('user_courses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []) as UserCourse[]
}

export async function getCourseDetails(courseId: string): Promise<{ modules: (CourseModule & { lessons: CourseLesson[] })[] }> {
  const { data: modules } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_num')

  const result = []
  for (const mod of modules ?? []) {
    const { data: lessons } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('module_id', mod.id)
      .order('order_num')
    result.push({ ...mod as CourseModule, lessons: (lessons ?? []) as CourseLesson[] })
  }
  return { modules: result as (CourseModule & { lessons: CourseLesson[] })[] }
}

export async function toggleLesson(lessonId: string, done: boolean): Promise<void> {
  await supabase.from('course_lessons').update({ done }).eq('id', lessonId)
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export interface Challenge {
  id: string
  community_id: string
  title: string
  description: string
  level: 'debutant' | 'intermediaire' | 'expert'
  expires_at: string
  created_at: string
}

export interface ChallengeSubmission {
  id: string
  challenge_id: string
  user_id: string
  content: string
  created_at: string
}

export async function getChallenges(communityId: string): Promise<Challenge[]> {
  const { data } = await supabase
    .from('challenges')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
  return (data ?? []) as Challenge[]
}

export async function generateChallenge(communityId: string, topic: string, level: string): Promise<Challenge> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-challenge`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ communityId, topic, level }),
    }
  )
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data as Challenge
}

export async function submitChallenge(challengeId: string, userId: string, content: string): Promise<void> {
  const { error } = await supabase.from('challenge_submissions').insert({
    challenge_id: challengeId, user_id: userId, content,
  })
  if (error && !error.message.includes('duplicate')) throw new Error(error.message)
}

export async function getChallengeSubmissions(challengeId: string): Promise<ChallengeSubmission[]> {
  const { data } = await supabase
    .from('challenge_submissions')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ChallengeSubmission[]
}

// ─── Ressources de classe pour le calendrier d'étude ─────────────────────────

export async function getClassroomResources(userId: string): Promise<{ name: string; url: string }[]> {
  // Trouver la classe de l'élève via classroom_members
  const { data: memberships } = await supabase
    .from('classroom_members')
    .select('classroom_id')
    .eq('student_id', userId)

  if (!memberships || memberships.length === 0) return []

  const classroomIds = memberships.map((m: { classroom_id: string }) => m.classroom_id)

  // Trouver les communautés scolaires liées à ces classes
  const { data: communities } = await supabase
    .from('communities')
    .select('id')
    .in('classroom_id', classroomIds)
    .eq('type', 'school')

  if (!communities || communities.length === 0) return []

  const communityIds = communities.map((c: { id: string }) => c.id)

  // Trouver les canaux #ressources
  const { data: channels } = await supabase
    .from('community_channels')
    .select('id')
    .in('community_id', communityIds)
    .eq('type', 'resources')

  if (!channels || channels.length === 0) return []

  const channelIds = channels.map((c: { id: string }) => c.id)

  // Récupérer les messages avec fichiers
  const { data: messages } = await supabase
    .from('community_messages')
    .select('file_name, file_url, content')
    .in('channel_id', channelIds)
    .not('file_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)

  return (messages ?? []).map((m: Record<string, string>) => ({
    name: m.file_name ?? m.content,
    url:  m.file_url ?? '',
  }))
}

// ─── Flashcards ───────────────────────────────────────────────────────────────
export async function generateFlashcards(
  pdfText: string,
  numCards: number,
  language: 'fr' | 'en',
  documentTitle: string,
  existingCards?: { front: string; back: string; topic: string }[]
): Promise<{ front: string; back: string; topic: string }[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flashcards`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ pdfText, numCards, language, documentTitle, existingCards }),
    }
  )
  if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`)
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  if (!Array.isArray(data.cards)) throw new Error('Format de réponse invalide.')
  return data.cards
}

// ─── Flashcard Sets (sauvegarde) ─────────────────────────────────────────────

export interface FlashcardSet {
  id: string
  title: string
  subject: string
  source_text: string
  cards: { front: string; back: string; topic: string }[]
  created_at: string
  updated_at: string
}

export async function saveFlashcardSet(
  userId: string,
  title: string,
  subject: string,
  sourceText: string,
  cards: { front: string; back: string; topic: string }[]
): Promise<FlashcardSet> {
  const { data, error } = await supabase
    .from('flashcard_sets')
    .insert({ user_id: userId, title, subject, source_text: sourceText, cards })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as FlashcardSet
}

export async function getFlashcardSets(userId: string): Promise<FlashcardSet[]> {
  const { data, error } = await supabase
    .from('flashcard_sets')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as FlashcardSet[]
}

export async function updateFlashcardSet(
  setId: string,
  cards: { front: string; back: string; topic: string }[]
): Promise<void> {
  const { error } = await supabase
    .from('flashcard_sets')
    .update({ cards, updated_at: new Date().toISOString() })
    .eq('id', setId)
  if (error) throw new Error(error.message)
}

export async function deleteFlashcardSet(setId: string): Promise<void> {
  const { error } = await supabase
    .from('flashcard_sets')
    .delete()
    .eq('id', setId)
  if (error) throw new Error(error.message)
}

// ─── Mon Cartable ─────────────────────────────────────────────────────────────

export type CartableUnitLabel = 'UA' | 'Chapitre'

export interface Cahier {
  id: string
  name: string
  course_code: string
  created_at: string
  updated_at: string
  uas?: UA[]
  summary_points?: string[] | null
  summary_generated_at?: string | null
  unit_label: CartableUnitLabel
}

export interface UA {
  id: string
  cahier_id: string
  number: number
  label: string
  created_at: string
  documents?: CartableDocument[]
  summary_points?: string[] | null
  rewritten_content?: string | null
  rewritten_comments?: Record<string, string> | null
  content_generated_at?: string | null
  audio_path?: string | null
  audio_language?: string | null
  audio_voice?: string | null
  audio_markers?: number[] | null
}

export interface CartableDocument {
  id: string
  ua_id: string
  filename: string
  text_content: string
  file_size: number
  created_at: string
}

export interface RevisionExercise {
  question: string
  choices: string[]
  answerIndex: number
  correctExplanation: string
  wrongExplanations: Record<string, string>
  attentionPoints: string[]
  uaTag: string
}

export interface RevisionResult {
  globalAttentionPoints: string[]
  exercises: RevisionExercise[]
}

// Cahiers
export async function getCahiers(userId: string): Promise<Cahier[]> {
  const { data, error } = await supabase
    .from('cartable_cahiers')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Cahier[]
}

export async function createCahier(
  userId: string, name: string, courseCode: string, unitLabel: CartableUnitLabel = 'UA'
): Promise<Cahier> {
  const { data, error } = await supabase
    .from('cartable_cahiers')
    .insert({ user_id: userId, name, course_code: courseCode, unit_label: unitLabel })
    .select().single()
  if (error) throw new Error(error.message)
  return data as Cahier
}

export async function deleteCahier(cahierId: string): Promise<void> {
  const { error } = await supabase.from('cartable_cahiers').delete().eq('id', cahierId)
  if (error) throw new Error(error.message)
}

// UAs
export async function getUAs(cahierId: string): Promise<UA[]> {
  const { data, error } = await supabase
    .from('cartable_uas')
    .select('*')
    .eq('cahier_id', cahierId)
    .order('number', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as UA[]
}

export async function createUA(cahierId: string, number: number, label: string): Promise<UA> {
  const { data, error } = await supabase
    .from('cartable_uas')
    .insert({ cahier_id: cahierId, number, label })
    .select().single()
  if (error) throw new Error(error.message)
  return data as UA
}

export async function deleteUA(uaId: string): Promise<void> {
  const { error } = await supabase.from('cartable_uas').delete().eq('id', uaId)
  if (error) throw new Error(error.message)
}

// Documents
export async function getDocuments(uaId: string): Promise<CartableDocument[]> {
  const { data, error } = await supabase
    .from('cartable_documents')
    .select('*')
    .eq('ua_id', uaId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CartableDocument[]
}

export async function uploadDocument(
  uaId: string, userId: string, filename: string, textContent: string, fileSize: number
): Promise<CartableDocument> {
  const { data, error } = await supabase
    .from('cartable_documents')
    .insert({ ua_id: uaId, user_id: userId, filename, text_content: textContent, file_size: fileSize })
    .select().single()
  if (error) throw new Error(error.message)
  return data as CartableDocument
}

export async function deleteDocument(docId: string): Promise<void> {
  const { error } = await supabase.from('cartable_documents').delete().eq('id', docId)
  if (error) throw new Error(error.message)
}

// Révision
export async function generateRevision(
  mode: 'ua' | 'final',
  cahierName: string,
  uas: { number: number; label: string; content: string }[],
  numQuestions: number,
  language: 'fr' | 'en',
  existingQuestions?: { question: string }[],
  unitLabel: CartableUnitLabel = 'UA'
): Promise<RevisionResult> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cartable-revision`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ mode, cahierName, uas, numQuestions, language, existingQuestions, unitLabel }),
    }
  )
  if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`)
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data as RevisionResult
}

// ─── Cartable — résumés & cours réécrit (générés à la demande, mis en cache) ──

async function callCartableEnrich(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cartable-enrich`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }
  )
  if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`)
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function generateCahierSummary(
  cahierId: string, title: string, content: string, language: 'fr' | 'en'
): Promise<string[]> {
  const data = await callCartableEnrich({ action: 'summary', title, content, language })
  const points = (Array.isArray(data.points) ? data.points : []) as string[]
  await supabase.from('cartable_cahiers')
    .update({ summary_points: points, summary_generated_at: new Date().toISOString() })
    .eq('id', cahierId)
  return points
}

export async function generateUASummary(
  uaId: string, title: string, content: string, language: 'fr' | 'en'
): Promise<string[]> {
  const data = await callCartableEnrich({ action: 'summary', title, content, language })
  const points = (Array.isArray(data.points) ? data.points : []) as string[]
  await supabase.from('cartable_uas').update({ summary_points: points }).eq('id', uaId)
  return points
}

export async function generateUARewrite(
  uaId: string, title: string, content: string, language: 'fr' | 'en'
): Promise<{ rewritten: string; comments: Record<string, string> }> {
  const data = await callCartableEnrich({ action: 'rewrite', title, content, language })
  const rewritten = (data.rewritten as string) ?? ''
  const comments  = (data.comments as Record<string, string>) ?? {}
  await supabase.from('cartable_uas')
    .update({ rewritten_content: rewritten, rewritten_comments: comments, content_generated_at: new Date().toISOString() })
    .eq('id', uaId)
  return { rewritten, comments }
}

// ─── Mon Cartable — voix IA (Pro / Autodidacte), audio mis en cache ──────────

export async function getUAAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('cartable-audio')
    .createSignedUrl(path, 3600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

// Génère l'audio via OpenAI TTS, le met en cache dans Storage, et retourne une
// URL de lecture. Un même UA + langue n'est synthétisé qu'une seule fois.
export async function generateUAAudio(
  uaId: string, userId: string, text: string, language: 'fr' | 'en', voice = 'nova'
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text, voice }),
    }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `Erreur serveur: ${response.status}`)
  }
  const blob = await response.blob()

  const path = `${userId}/${uaId}-${language}-${voice}.mp3`
  const { error: uploadError } = await supabase.storage
    .from('cartable-audio')
    .upload(path, blob, { contentType: 'audio/mpeg', upsert: true })
  if (uploadError) throw new Error(uploadError.message)

  await supabase.from('cartable_uas')
    .update({ audio_path: path, audio_language: language, audio_voice: voice })
    .eq('id', uaId)

  return getUAAudioUrl(path)
}

export async function updateUAAudioMarkers(uaId: string, markers: number[]): Promise<void> {
  const { error } = await supabase.from('cartable_uas').update({ audio_markers: markers }).eq('id', uaId)
  if (error) throw new Error(error.message)
}

// ─── Aide aux devoirs (tuteur IA) ─────────────────────────────────────────────

export interface HomeworkSession {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface HomeworkMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  attachment_name: string | null
  created_at: string
}

export async function getHomeworkSessions(userId: string): Promise<HomeworkSession[]> {
  const { data, error } = await supabase
    .from('homework_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as HomeworkSession[]
}

export async function createHomeworkSession(userId: string, title = 'Nouvelle conversation'): Promise<HomeworkSession> {
  const { data, error } = await supabase
    .from('homework_sessions')
    .insert({ user_id: userId, title })
    .select().single()
  if (error) throw new Error(error.message)
  return data as HomeworkSession
}

export async function renameHomeworkSession(sessionId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('homework_sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}

export async function touchHomeworkSession(sessionId: string): Promise<void> {
  await supabase.from('homework_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId)
}

export async function deleteHomeworkSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('homework_sessions').delete().eq('id', sessionId)
  if (error) throw new Error(error.message)
}

export async function getHomeworkMessages(sessionId: string): Promise<HomeworkMessage[]> {
  const { data, error } = await supabase
    .from('homework_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as HomeworkMessage[]
}

export async function addHomeworkMessage(
  sessionId: string, role: 'user' | 'assistant', content: string, attachmentName?: string
): Promise<HomeworkMessage> {
  const { data, error } = await supabase
    .from('homework_messages')
    .insert({ session_id: sessionId, role, content, attachment_name: attachmentName ?? null })
    .select().single()
  if (error) throw new Error(error.message)
  return data as HomeworkMessage
}

// ─── Mon Cartable — notes de l'élève (page de lecture) ────────────────────────

export interface UANote {
  id: string
  ua_id: string
  user_id: string
  kind: 'general' | 'inline'
  content: string
  anchor_text: string | null
  paragraph_index: number | null
  created_at: string
}

export async function getUANotes(uaId: string): Promise<UANote[]> {
  const { data, error } = await supabase
    .from('cartable_ua_notes')
    .select('*')
    .eq('ua_id', uaId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as UANote[]
}

export async function addUANote(
  uaId: string, userId: string, kind: 'general' | 'inline', content: string,
  anchorText?: string, paragraphIndex?: number
): Promise<UANote> {
  const { data, error } = await supabase
    .from('cartable_ua_notes')
    .insert({
      ua_id: uaId, user_id: userId, kind, content,
      anchor_text: anchorText ?? null, paragraph_index: paragraphIndex ?? null,
    })
    .select().single()
  if (error) throw new Error(error.message)
  return data as UANote
}

export async function deleteUANote(noteId: string): Promise<void> {
  const { error } = await supabase.from('cartable_ua_notes').delete().eq('id', noteId)
  if (error) throw new Error(error.message)
}

// ─── Agenda Events ────────────────────────────────────────────────────────────

export interface AgendaEvent {
  id:             string
  user_id:        string
  type:           'exam' | 'work' | 'busy' | 'study_slot'
  title:          string
  date:           string        // YYYY-MM-DD
  start_time?:    string        // HH:MM
  end_time?:      string        // HH:MM
  is_recurring:   boolean
  recurring_days?: number[]     // 0=Sun..6=Sat
  recurring_end?:  string       // YYYY-MM-DD
  color?:          string
  created_at:      string
}

export type AgendaEventInsert = Omit<AgendaEvent, 'id' | 'created_at'>

export async function getAgendaEvents(userId: string): Promise<AgendaEvent[]> {
  const { data, error } = await supabase
    .from('agenda_events')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as AgendaEvent[]
}

export async function createAgendaEvent(event: AgendaEventInsert): Promise<AgendaEvent> {
  const { data, error } = await supabase
    .from('agenda_events')
    .insert([event])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as AgendaEvent
}

export async function deleteAgendaEvent(id: string): Promise<void> {
  const { error } = await supabase.from('agenda_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Generate Study Plan (with agenda) ───────────────────────────────────────

export async function generateAndSaveStudyPlan(
  userId: string,
  goal: string,
  examDate: string | null,
  results: QuizResult[],
  resources: { name: string }[],
  agendaEvents?: AgendaEvent[],
) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const startDate = new Date().toISOString().split('T')[0]

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-study-plan`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ goal, examDate, results, startDate, resources, agendaEvents }),
    }
  )
  if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`)
  const planData = await response.json()
  if (planData.error) throw new Error(planData.error)

  // Supprimer l'ancien plan si existant
  const existing = await getStudyPlan(userId)
  if (existing?.plan) await deleteStudyPlan(existing.plan.id)

  // Sauvegarder le nouveau plan
  const { data: planRow, error: planErr } = await supabase
    .from('study_plans')
    .insert([{ user_id: userId, goal, exam_date: examDate }])
    .select()
    .single()
  if (planErr) throw new Error(planErr.message)

  const itemsToInsert = planData.items.map((item: Omit<StudyPlanItem, 'id' | 'plan_id' | 'done'>) => ({
    plan_id: planRow.id,
    date:    item.date,
    subject: item.subject,
    description: item.description,
    duration_min: item.duration_min,
    done: false,
  }))
  const { data: itemRows, error: itemsErr } = await supabase
    .from('study_plan_items')
    .insert(itemsToInsert)
    .select()
  if (itemsErr) throw new Error(itemsErr.message)

  return { plan: planRow as StudyPlan, items: itemRows as StudyPlanItem[] }
}
