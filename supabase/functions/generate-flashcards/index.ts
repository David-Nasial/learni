// ─── Edge Function : generate-flashcards ─────────────────────────────────────
// Génère des flashcards recto/verso depuis un texte source.

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
    const { pdfText, numCards, language, documentTitle } = await req.json()

    if (!pdfText) {
      return new Response(JSON.stringify({ error: 'pdfText manquant' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const num   = Math.min(numCards ?? 15, 30)
    const lang  = language === 'en' ? 'English' : 'français'
    const title = documentTitle ?? 'document'

    const userPrompt = `
Tu es LearnI. Génère exactement ${num} flashcards en ${lang} à partir du texte source du document "${title}".

Texte source :
---
${pdfText.slice(0, 12000)}
---

Retourne un JSON avec cette structure EXACTE (tableau de ${num} objets) :
[
  {
    "front": "Terme, concept ou question courte (côté recto)",
    "back": "Définition, explication ou réponse concise (côté verso, 1-3 phrases max)",
    "topic": "Thème court (ex: Biologie, Dates, Définitions)"
  }
]

Règles :
- Le recto doit être court et clair (un terme, une question, ou un concept clé)
- Le verso doit être complet mais concis — pas de phrases trop longues
- Couvre des thèmes variés du texte
- Réponds UNIQUEMENT en JSON valide, sans markdown
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
        max_tokens: 4096,
        system:     'Tu es LearnI. Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.',
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

    const clean = rawText.replace(/```json|```/g, '').trim()
    const cards = JSON.parse(clean)

    return new Response(JSON.stringify({ cards }), {
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
