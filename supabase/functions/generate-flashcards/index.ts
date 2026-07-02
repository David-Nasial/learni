// ─── Edge Function : generate-flashcards ─────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MATH_KEYWORDS = ['math', 'mathématique', 'algèbre', 'calcul', 'géométrie', 'trigonométrie', 'statistique', 'probabilité', 'physique', 'chimie', 'formule']

function isMathSubject(title: string, text: string): boolean {
  const combined = (title + ' ' + text.slice(0, 500)).toLowerCase()
  return MATH_KEYWORDS.some(k => combined.includes(k))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pdfText, numCards, language, documentTitle, existingCards } = await req.json()

    if (!pdfText) {
      return new Response(JSON.stringify({ error: 'pdfText manquant' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const num   = Math.min(numCards ?? 15, 30)
    const lang  = language === 'en' ? 'English' : 'français'
    const title = documentTitle ?? 'document'
    const isMath = isMathSubject(title, pdfText)

    // Cartes déjà générées à éviter (pour la régénération)
    const alreadyGenerated = Array.isArray(existingCards) && existingCards.length > 0
      ? `\n\nIMPORTANT : Ces cartes existent DÉJÀ — ne les répète PAS, génère de nouvelles cartes différentes :\n${existingCards.map((c: { front: string }) => `- "${c.front}"`).join('\n')}`
      : ''

    const focusInstruction = isMath
      ? `Focus prioritaire pour ce document (mathématiques/sciences) :
- Formules essentielles (avec leur signification)
- Théorèmes et leurs conditions d'application
- Définitions clés
- Erreurs fréquentes ou points à ne pas confondre
- Étapes de raisonnement importantes`
      : `Focus prioritaire :
- Concepts et définitions clés
- Dates, faits et événements importants
- Points souvent négligés ou mal compris
- Relations de cause à effet
- Termes techniques à maîtriser`

    const userPrompt = `
Tu es LearnI. Génère exactement ${num} flashcards en ${lang} à partir du document "${title}".

Texte source :
---
${pdfText.slice(0, 12000)}
---

${focusInstruction}
${alreadyGenerated}

Retourne un JSON avec cette structure EXACTE (tableau de ${num} objets) :
[
  {
    "front": "Terme, formule ou question courte (côté recto)",
    "back": "Définition, explication ou réponse concise (1-3 phrases max)",
    "topic": "Thème court (ex: Formules, Définitions, Points clés)"
  }
]

Règles :
- Le recto doit être court et précis
- Le verso doit être complet mais concis
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
