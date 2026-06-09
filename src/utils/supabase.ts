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
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as Profile
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
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

export async function generateAndSaveStudyPlan(
  userId: string,
  goal: string,
  examDate: string | null,
  results: unknown[],
  resources: { name: string; url: string }[] = []
): Promise<{ plan: StudyPlan; items: StudyPlanItem[] }> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  // Appel à l'edge function pour générer les items
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-study-plan`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ goal, examDate, results, resources, startDate: new Date().toISOString().split('T')[0] }),
    }
  )
  const data = await response.json() as { items?: StudyPlanItem[]; error?: string }
  if (data.error) throw new Error(data.error)
  if (!data.items) throw new Error('Aucun item généré.')

  // Sauvegarder le plan
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .insert({ user_id: userId, goal, exam_date: examDate })
    .select().single()
  if (planError) throw new Error(planError.message)

  // Sauvegarder les items
  const itemsToInsert = data.items.map(item => ({ ...item, plan_id: plan.id, done: false }))
  const { data: items, error: itemsError } = await supabase
    .from('study_plan_items')
    .insert(itemsToInsert)
    .select()
  if (itemsError) throw new Error(itemsError.message)

  return { plan: plan as StudyPlan, items: items as StudyPlanItem[] }
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

export async function generateAndSaveCourse(
  userId: string,
  subject: string,
  level: 'debutant' | 'intermediaire' | 'expert'
): Promise<UserCourse> {
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
      body: JSON.stringify({ subject, level, action: 'generate' }),
    }
  )
  const data = await response.json()
  if (data.error) throw new Error(data.error)

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
