import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FORBIDDEN = ['sexuel', 'pornograph', 'drogue', 'stupéfiant', 'arme', 'violence', 'haine', 'racisme', 'terroris']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { subject, level, action } = await req.json()

    // Filtrage contenu inapproprié
    const subjectLower = subject?.toLowerCase() ?? ''
    if (FORBIDDEN.some(w => subjectLower.includes(w))) {
      throw new Error('Ce sujet n\'est pas disponible sur LearnI.')
    }

    // Action 1 : générer les questions d'évaluation
    if (action === 'assess') {
      const prompt = `Tu es un expert en éducation. Génère 5 questions à choix multiples pour évaluer le niveau d'un élève en "${subject}".
Les questions doivent aller du très facile au difficile.
Chaque question doit avoir 5 choix : 4 vrais choix + "Je ne sais pas" en dernier (index 4). Si l'élève choisit "Je ne sais pas", ce n'est jamais la bonne réponse (answerIndex ne peut jamais être 4).
Réponds UNIQUEMENT en JSON :
{
  "questions": [
    { "question": "...", "choices": ["A", "B", "C", "D", "Je ne sais pas"], "answerIndex": 0, "level": "debutant" }
  ]
}`
      const r = await callClaude(prompt)
      return new Response(r, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Action 2 : générer le cours complet
    if (action === 'generate') {
      const levelLabel = level === 'debutant' ? 'débutant complet' : level === 'intermediaire' ? 'niveau intermédiaire' : 'niveau avancé/expert'

      const prompt = `Tu es un expert en "${subject}" et en pédagogie. Crée un cours complet pour un élève de niveau ${levelLabel}.

Le cours doit être structuré comme TryHackMe : modules progressifs avec leçons théoriques et exercices pratiques.

Règles :
- Contenu sain, éducatif, positif
- Adapté au niveau ${levelLabel}
- Entre 4 et 6 modules
- Chaque module : 2-4 leçons
- Chaque leçon : contenu clair + un exercice pratique
- Progressif : du plus simple au plus complexe

Réponds UNIQUEMENT en JSON :
{
  "title": "Titre du cours",
  "description": "Description courte du cours (2 phrases)",
  "modules": [
    {
      "title": "Titre du module",
      "description": "Ce que l'élève va apprendre",
      "order_num": 1,
      "lessons": [
        {
          "title": "Titre de la leçon",
          "content": "Contenu pédagogique (2-3 paragraphes max, concis)",
          "exercise": "Exercice pratique concret à réaliser",
          "order_num": 1
        }
      ]
    }
  ]
}`
      const r = await callClaude(prompt, 8000)
      return new Response(r, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error('Action invalide')

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function callClaude(prompt: string, maxTokens = 2048): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: 'Tu es un expert pédagogue. Réponds UNIQUEMENT en JSON valide sans markdown. Sois concis.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(`Anthropic ${response.status}: ${err?.error?.message ?? 'erreur'}`)
  }
  const data = await response.json()
  // Check if response was truncated
  if (data.stop_reason === 'max_tokens') {
    throw new Error('Le cours généré est trop long. Réessaie avec un sujet plus précis.')
  }
  const text = data.content
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
  return text.replace(/```json|```/g, '').trim()
}
