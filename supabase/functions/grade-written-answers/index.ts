// ─── Edge Function : grade-written-answers ───────────────────────────────────
// Corrige les réponses écrites d'un quiz en mode mixte via l'IA, côté serveur.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GradeItem {
  index:       number
  question:    string
  modelAnswer: string
  keyPoints:   string[]
  userAnswer:  string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { items, language } = await req.json() as { items: GradeItem[]; language?: string }

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'items manquant' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const lang = language === 'en' ? 'English' : 'français'

    const itemsBlock = items.map(it => `
[${it.index}]
Question : ${it.question}
Réponse modèle : ${it.modelAnswer}
Éléments clés attendus : ${it.keyPoints.join(', ')}
Réponse de l'élève : ${it.userAnswer || '(vide)'}
`.trim()).join('\n\n')

    const userPrompt = `
Tu corriges des réponses écrites d'un quiz. Pour chaque question ci-dessous, juge si la réponse de l'élève démontre une compréhension correcte du sujet — ne compare pas mot à mot, juge le sens et la présence des éléments clés attendus. Une réponse partielle qui couvre l'idée principale peut être jugée correcte. Une réponse vide, hors sujet ou qui rate les éléments clés est incorrecte.

Réponds en ${lang} pour le champ "feedback".

${itemsBlock}

Retourne un JSON avec cette structure EXACTE (tableau, un objet par question, dans l'ordre) :
[
  {
    "index": 0,
    "isCorrect": true,
    "feedback": "1-2 phrases expliquant ce qui est correct ou ce qui manque."
  }
]

Réponds UNIQUEMENT en JSON valide, sans markdown.
`.trim()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 4096,
        system:     'Tu es LearnI, un correcteur pédagogique juste et bienveillant. Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.',
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(`Anthropic ${response.status}: ${err?.error?.message ?? 'erreur inconnue'}`)
    }

    const data = await response.json()
    const rawText = data.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')

    const clean = rawText.replace(/```json|```/g, '').trim()
    const results = JSON.parse(clean)

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
