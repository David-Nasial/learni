export interface Question {
  id: string
  type: 'mcq' | 'written'
  question: string
  choices: string[]
  answerIndex: number
  explanation: string
  topic?: string
  modelAnswer?: string
  keyPoints?: string[]
}

export interface WrittenGrade {
  isCorrect: boolean
  feedback: string
}

export interface QuizSession {
  id: string
  title: string
  questions: Question[]
  currentIndex: number
  answers: (number | string | null)[]
  startedAt: Date
  finishedAt?: Date
}

export interface TopicResult {
  topic: string
  correct: number
  total: number
}

export interface QuizResult {
  id: string
  title: string
  score: number
  correct: number
  total: number
  date: string
  durationSeconds: number
  topicResults?: TopicResult[]
}

export type QuizLength = 10 | 20 | 35
export type QuestionType = 'all' | 'facts' | 'dates' | 'definitions'
export type AnswerMode = 'mcq' | 'mixed'
export type QuizLanguage = 'fr' | 'en'

export interface GenerateOptions {
  pdfText: string
  numQuestions: QuizLength
  questionType: QuestionType
  answerMode: AnswerMode
  language: QuizLanguage
  documentTitle: string
  teacherSpecs?: string
}

export type Plan = 'free' | 'starter' | 'pro' | 'autodidacte' | 'teacher'
export type UserRole = 'student' | 'teacher' | 'superadmin'
export type AppMode = 'personal' | 'school'
export type TutorMode = 'teacher' | 'beginner' | 'exam'

export type Page =
  | 'home'
  | 'upload'
  | 'generating'
  | 'grading'
  | 'quiz'
  | 'results'
  | 'history'
  | 'pricing'
  | 'login'
  | 'teacher'
  | 'student'
  | 'tutor'
  | 'community'
  | 'study'
  | 'courses'
  | 'flashcards'
  | 'cartable'
  | 'homework'

// ─── Community types ──────────────────────────────────────────────────────────

export interface Community {
  id: string
  name: string
  description: string
  topic: string
  emoji: string
  type: 'autodidacte' | 'school'
  classroom_id: string | null
  member_count: number
  created_at: string
  is_member?: boolean
}

export interface CommunityChannel {
  id: string
  community_id: string
  name: string
  description: string
  emoji: string
  type: 'text' | 'resources' | 'challenges' | 'leaderboard'
}

export interface CommunityMessage {
  id: string
  channel_id: string
  user_id: string
  content: string
  file_url: string | null
  file_name: string | null
  created_at: string
  author_name: string
  author_role: string
}

export interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Flashcard {
  front: string
  back: string
  topic: string
}
