import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { goal, examDate, results, startDate, resources } = await req.json()

    const resultsSummary = results?.length
      ? results.slice(0, 10).map((r: Record<string, unknown>) =>
          `- ${r.title}: ${r.score}% (${r.correct}/${r.total} bonnes réponses)`
        ).join('\n')
      : 'Aucun résultat disponible encore.'

    const resourcesSummary = resources?.length
      ? '\nDocuments disponibles (envoyés par le professeur ou téléversés) :\n' +
        resources.map((r: { name: string }) => `- ${r.name}`).join('\n')
      : ''

    const start = startDate ?? new Date().toISOString().split('T')[0]
    const end   = examDate ?? (() => {
      const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]
    })()

    const prompt = `Tu es un coach scolaire expert. Génère un plan d'étude personnalisé.

Objectif : ${goal}
Date de début : ${start}
Date d'examen/fin : ${end}
Résultats récents de l'élève :
${resultsSummary}${resourcesSummary}

Génère un plan d'étude jour par jour du ${start} au ${end}.
- Identifie les points faibles à partir des résultats
- Si des documents de cours sont disponibles, intègre-les dans le plan (ex: réviser tel document tel jour)
- Alterne les sujets pour éviter la fatigue
- Prévois des révisions générales les 2 derniers jours avant l'examen
- Maximum 2 heures d'étude par jour
- Pas d'étude le dimanche (repos)

Retourne UNIQUEMENT un JSON valide :
{
  "items": [
    {
      "date": "YYYY-MM-DD",
      "subject": "Nom court du sujet",
      "description": "Ce qu'il faut faire concrètement (1-2 phrases)",
      "duration_min": 45
    }
  ]
}
Réponds UNIQUEMENT en JSON, sans markdown.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: 'Tu es un coach scolaire. Réponds UNIQUEMENT en JSON valide sans markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const raw  = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
    const plan = JSON.parse(raw.replace(/```json|```/g, '').trim())

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
