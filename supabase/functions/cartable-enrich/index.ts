// ─── Edge Function : cartable-enrich ──────────────────────────────────────────
// Génère, pour Mon Cartable : des résumés (points clés) et des versions
// réécrites du contenu avec annotations de clarification.
// action "summary" : { points: string[] }
// action "rewrite" : { rewritten: string, comments: Record<string,string> }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function callClaude(system: string, userPrompt: string, maxTokens: number) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
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
  return JSON.parse(clean)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, title, content, language } = await req.json()

    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: 'Contenu manquant.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const lang = language === 'en' ? 'English' : 'français'
    const label = title || 'ce contenu'

    if (action === 'summary') {
      const userPrompt = `
Tu es un professeur expert. Résume le contenu suivant ("${label}") en ${lang}, sous forme de points clés — les différentes idées et notions développées.

Contenu :
---
${content.slice(0, 12000)}
---

Retourne un JSON avec cette structure EXACTE :
{ "points": ["Point clé 1...", "Point clé 2...", "..."] }

Règles :
- Entre 4 et 10 points
- Chaque point : 1-2 phrases concises, qui couvrent une idée distincte du contenu
- Couvre l'ensemble du contenu, pas seulement le début
- Réponds UNIQUEMENT en JSON valide, sans markdown
`.trim()

      const result = await callClaude(
        'Tu es un professeur expert. Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.',
        userPrompt, 2048
      )
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'rewrite') {
      const userPrompt = `
Tu es un professeur expert et pédagogue. Réécris le contenu suivant ("${label}") en ${lang} de façon plus claire et mieux structurée, pour faciliter la compréhension d'un étudiant — SANS retirer d'information importante ni en inventer.

Contenu original :
---
${content.slice(0, 12000)}
---

Instructions :
- Réécris en paragraphes clairs, avec un saut de ligne double ("\\n\\n") entre chaque paragraphe.
- Partout où un mot ou une phrase pourrait bénéficier d'un éclaircissement (terme technique, concept difficile, nuance importante, exemple utile), entoure-le du marqueur {{N|le mot ou la phrase}}, où N est un numéro unique croissant à partir de 1. Fournis le commentaire correspondant dans "comments".
- N'utilise AUCUNE balise HTML ni syntaxe Markdown (pas de **, #, -, etc.) — seulement le marqueur {{N|...}} et le texte brut.
- Vise entre 4 et 12 annotations selon la richesse du contenu.

Retourne un JSON avec cette structure EXACTE :
{
  "rewritten": "Texte réécrit avec des marqueurs {{1|phrase}} intégrés...\\n\\nParagraphe suivant...",
  "comments": { "1": "Commentaire qui clarifie ce point.", "2": "..." }
}

Réponds UNIQUEMENT en JSON valide, sans markdown.
`.trim()

      const result = await callClaude(
        'Tu es un professeur expert et pédagogue. Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.',
        userPrompt, 8192
      )
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Action inconnue.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
