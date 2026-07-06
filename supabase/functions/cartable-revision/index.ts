// ─── Edge Function : cartable-revision ───────────────────────────────────────
// Génère des exercices de révision riches depuis les notes d'UAs.
// Mode "ua" : révision d'une seule UA.
// Mode "final" : révision examen final couvrant toutes les UAs.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mode, cahierName, uas, numQuestions, language, existingQuestions } = await req.json()
    // uas = [{ number, label, content }]

    if (!uas || uas.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune unité d\'apprentissage fournie.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const lang   = language === 'en' ? 'English' : 'français'
    const num    = Math.min(numQuestions ?? 10, 20)
    const isFinal = mode === 'final'

    // Construire le texte source par UA
    const uaBlocks = uas.map((ua: { number: number; label: string; content: string }) =>
      `=== UA${ua.number}${ua.label ? ` — ${ua.label}` : ''} ===\n${ua.content.slice(0, 4000)}`
    ).join('\n\n')

    const alreadySeen = Array.isArray(existingQuestions) && existingQuestions.length > 0
      ? `\nNe répète PAS ces questions déjà posées :\n${existingQuestions.map((q: { question: string }) => `- "${q.question}"`).join('\n')}`
      : ''

    const finalInstructions = isFinal
      ? `C'est un EXAMEN FINAL — couvre obligatoirement TOUTES les UAs de façon équilibrée. Chaque UA doit avoir au moins une question.`
      : `C'est une révision de UA${uas[0].number} — toutes les questions doivent porter sur cette UA uniquement.`

    const userPrompt = `
Tu es un professeur expert. Génère exactement ${num} exercices de révision en ${lang} pour le cours "${cahierName}".

Notes de cours :
---
${uaBlocks}
---

${finalInstructions}
${alreadySeen}

Pour chaque exercice, fournis :
1. Une question claire (QCM avec 4 choix)
2. La bonne réponse (answerIndex 0-3)
3. Une explication TRÈS DÉTAILLÉE de la bonne réponse (2-4 phrases qui expliquent POURQUOI c'est correct, avec le contexte du cours)
4. Pour chaque mauvais choix : une phrase qui explique POURQUOI c'est incorrect
5. Un ou deux "points d'attention" : erreurs fréquentes ou subtilités à ne pas oublier sur ce sujet
6. Le tag UA concernée

Retourne un JSON avec cette structure EXACTE :
{
  "globalAttentionPoints": [
    "Point important à retenir pour tout l'examen...",
    "Erreur fréquente à éviter..."
  ],
  "exercises": [
    {
      "question": "...",
      "choices": ["Choix A", "Choix B", "Choix C", "Choix D"],
      "answerIndex": 0,
      "correctExplanation": "Explication détaillée de POURQUOI c'est la bonne réponse...",
      "wrongExplanations": {
        "1": "Pourquoi le choix B est incorrect...",
        "2": "Pourquoi le choix C est incorrect...",
        "3": "Pourquoi le choix D est incorrect..."
      },
      "attentionPoints": ["À ne pas oublier : ...", "Attention à ne pas confondre avec..."],
      "uaTag": "UA1"
    }
  ]
}

Réponds UNIQUEMENT en JSON valide, sans markdown.
`.trim()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 8000,
        system:     'Tu es un professeur expert. Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.',
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(`Anthropic ${response.status}: ${err?.error?.message ?? 'erreur inconnue'}`)
    }

    const data    = await response.json()
    const rawText = data.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')

    const clean  = rawText.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return new Response(JSON.stringify(result), {
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
