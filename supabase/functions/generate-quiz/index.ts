// ─── Edge Function : generate-quiz ───────────────────────────────────────────
// La clé Anthropic reste ici, côté serveur. Jamais exposée au navigateur.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pdfText, numQuestions, questionType, language, documentTitle } = await req.json()

    if (!pdfText) {
      return new Response(JSON.stringify({ error: 'pdfText manquant' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Prompt ──────────────────────────────────────────────────────────────
    const typeLabel: Record<string, string> = {
      all:         language === 'fr' ? 'tous types (faits, dates, définitions, concepts)' : 'all types',
      facts:       language === 'fr' ? 'faits clés'         : 'key facts',
      dates:       language === 'fr' ? 'dates et événements': 'dates and events',
      definitions: language === 'fr' ? 'définitions'        : 'definitions',
    }

    const lang  = language === 'fr' ? 'français' : 'English'
    const type  = typeLabel[questionType] ?? typeLabel['all']
    const title = documentTitle ?? 'document'

    const userPrompt = `
Génère exactement ${numQuestions} questions QCM en ${lang} de type : ${type}.

Texte source (extrait du document "${title}") :
---
${pdfText.slice(0, 12000)}
---

Retourne un JSON avec cette structure EXACTE (tableau de ${numQuestions} objets) :
[
  {
    "question": "...",
    "choices": ["Choix A", "Choix B", "Choix C", "Choix D"],
    "answerIndex": 0,
    "explanation": "Explication concise en 1-2 phrases.",
    "topic": "Thème court"
  }
]

Règles :
- 4 choix par question, UN seul correct
- answerIndex = index (0-3) de la bonne réponse
- Les mauvais choix doivent être plausibles
- Couvre différentes parties du texte
- Réponds UNIQUEMENT en JSON valide, sans markdown
`.trim()

    // ── Appel Anthropic ──────────────────────────────────────────────────────
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
        system:     'Tu es LearnI. Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.',
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
    const questions = JSON.parse(clean)

    return new Response(JSON.stringify({ questions }), {
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