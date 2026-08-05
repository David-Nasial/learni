// ─── Service IA — Appelle l'Edge Function Supabase (clé cachée côté serveur) ──
import { supabase } from './supabase'
import type { GenerateOptions, Question, WrittenGrade } from '../types'

export async function generateQuestions(opts: GenerateOptions): Promise<Question[]> {
  // Récupérer le token de session pour authentifier l'appel
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        pdfText:       opts.pdfText,
        numQuestions:  opts.numQuestions,
        questionType:  opts.questionType,
        answerMode:    opts.answerMode,
        language:      opts.language,
        documentTitle: opts.documentTitle,
        teacherSpecs:  opts.teacherSpecs,
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      `Erreur Edge Function ${response.status}: ${(err as { error?: string }).error ?? response.statusText}`
    )
  }

  const data = await response.json() as { questions?: Question[]; error?: string }

  if (data.error) throw new Error(data.error)
  if (!Array.isArray(data.questions)) throw new Error('Réponse inattendue du serveur.')

  return data.questions.map((q, i) => ({
    id:          `q-${Date.now()}-${i}`,
    type:        q.type === 'written' ? 'written' : 'mcq',
    question:    q.question,
    choices:     q.choices ?? [],
    answerIndex: q.answerIndex ?? -1,
    explanation: q.explanation,
    topic:       q.topic ?? '',
    modelAnswer: q.modelAnswer,
    keyPoints:   q.keyPoints,
  }))
}

export async function gradeWrittenAnswers(
  items: { index: number; question: string; modelAnswer: string; keyPoints: string[]; userAnswer: string }[],
  language: 'fr' | 'en'
): Promise<Record<number, WrittenGrade>> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-written-answers`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items, language }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      `Erreur Edge Function ${response.status}: ${(err as { error?: string }).error ?? response.statusText}`
    )
  }

  const data = await response.json() as { results?: { index: number; isCorrect: boolean; feedback: string }[]; error?: string }

  if (data.error) throw new Error(data.error)
  if (!Array.isArray(data.results)) throw new Error('Réponse inattendue du serveur.')

  const graded: Record<number, WrittenGrade> = {}
  for (const r of data.results) {
    graded[r.index] = { isCorrect: r.isCorrect, feedback: r.feedback }
  }
  return graded
}
