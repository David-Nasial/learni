import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { communityId, topic, level } = await req.json()

    const levelLabel = level === 'debutant' ? 'débutant' : level === 'intermediaire' ? 'intermédiaire' : 'expert'

    const prompt = `Tu es un coach pédagogique. Génère un "Challenge de la semaine" pour une communauté d'apprentissage sur le thème "${topic}" pour des apprenants de niveau ${levelLabel}.

Le challenge doit :
- Être motivant et engageant
- Être réalisable en 2-5 heures
- Avoir un objectif clair et mesurable
- Encourager le partage dans la communauté
- Être éducatif et valorisant

Réponds UNIQUEMENT en JSON :
{
  "title": "Titre accrocheur du challenge (max 60 chars)",
  "description": "Description complète du challenge avec objectifs, étapes et comment partager le résultat (3-5 phrases)"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 512,
        system: 'Tu es un coach pédagogique. Réponds UNIQUEMENT en JSON valide sans markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
    const challenge = JSON.parse(text.replace(/```json|```/g, '').trim())

    // Expiration dans 2 semaines
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 14)

    const { data: saved, error } = await supabase
      .from('challenges')
      .insert({
        community_id: communityId,
        title: challenge.title,
        description: challenge.description,
        level,
        expires_at: expiresAt.toISOString(),
      })
      .select().single()

    if (error) throw new Error(error.message)

    return new Response(JSON.stringify(saved), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
