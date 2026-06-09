// ─── Service IA — Appelle l'Edge Function Supabase (clé cachée côté serveur) ──
import { supabase } from './supabase'
import type { GenerateOptions, Question } from '../types'

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
        language:      opts.language,
        documentTitle: opts.documentTitle,
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
    question:    q.question,
    choices:     q.choices,
    answerIndex: q.answerIndex,
    explanation: q.explanation,
    topic:       q.topic ?? '',
  }))
}
