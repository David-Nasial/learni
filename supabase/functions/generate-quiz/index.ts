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
    const { pdfText, numQuestions, questionType, answerMode, language, documentTitle, teacherSpecs } = await req.json()

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
    const mixed = answerMode === 'mixed'

    const specsBlock = teacherSpecs?.trim() ? `
Consignes données par le professeur pour cet examen — respecte-les en priorité (chapitres à cibler, sujets à exclure, contraintes de format, style de l'examen, etc.) :
---
${teacherSpecs.trim().slice(0, 3000)}
---
` : ''

    const mcqSchema = `  {
    "type": "mcq",
    "question": "...",
    "choices": ["Choix A", "Choix B", "Choix C", "Choix D"],
    "answerIndex": 0,
    "explanation": "Explication concise en 1-2 phrases.",
    "topic": "Thème court"
  }`

    const writtenSchema = `  {
    "type": "written",
    "question": "...",
    "choices": [],
    "answerIndex": -1,
    "modelAnswer": "Réponse modèle complète, 2-4 phrases.",
    "keyPoints": ["Élément clé 1 attendu", "Élément clé 2 attendu"],
    "explanation": "Explication concise en 1-2 phrases.",
    "topic": "Thème court"
  }`

    const userPrompt = mixed ? `
Génère exactement ${numQuestions} questions en ${lang} de type : ${type}, à partir du texte source ci-dessous.

Ce quiz est en MODE MIXTE : pour chaque question, décide toi-même si elle convient mieux à un choix multiple (QCM) ou à une réponse écrite ouverte.
- Utilise le QCM pour les faits précis, dates, définitions courtes, ou tout ce qui a une réponse unique et courte.
- Utilise la réponse écrite pour les questions qui demandent d'expliquer un concept, de justifier un raisonnement, ou de reformuler dans ses propres mots.
- Vise un mélange raisonnable des deux types (ni 100% QCM, ni 100% écrit), selon ce que le texte permet.

Texte source (extrait du document "${title}") :
---
${pdfText.slice(0, 12000)}
---
${specsBlock}
Retourne un JSON avec cette structure EXACTE (tableau de ${numQuestions} objets, chaque objet étant soit de type "mcq" soit de type "written") :
[
${mcqSchema},
${writtenSchema}
]

Règles :
- Pour "mcq" : 4 choix, UN seul correct, answerIndex = index (0-3) de la bonne réponse, mauvais choix plausibles
- Pour "written" : choices = [], answerIndex = -1, modelAnswer = la réponse idéale complète, keyPoints = 2-4 éléments que la réponse de l'élève devrait couvrir pour être jugée correcte
- Couvre différentes parties du texte
- Réponds UNIQUEMENT en JSON valide, sans markdown
`.trim() : `
Génère exactement ${numQuestions} questions QCM en ${lang} de type : ${type}.

Texte source (extrait du document "${title}") :
---
${pdfText.slice(0, 12000)}
---
${specsBlock}
Retourne un JSON avec cette structure EXACTE (tableau de ${numQuestions} objets) :
[
${mcqSchema}
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
        max_tokens: 8192,
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