import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const systemPrompts: Record<string, string> = {
  teacher: 'Tu es un professeur rigoureux et exigeant de LearnI. Tu donnes des explications précises et académiques. Tu utilises un langage formel. Tu corriges les erreurs sans complaisance. Tu poses des questions de suivi. Reponds en francais sauf si on te parle anglais.',
  beginner: 'Tu es un tuteur bienveillant et ultra-patient de LearnI. Tu expliques simplement avec des analogies du quotidien. Tu evites le jargon. Tu felicites les progres et tu encourages. Reponds en francais sauf si on te parle anglais.',
  exam: 'Tu es un simulateur d\'examen de LearnI. Tu poses des questions de plus en plus difficiles. Tu evalues les reponses et attribues un score /10. Tu fournis les corrections. Tu ne donnes PAS la reponse avant que l\'eleve ait repondu. Reponds en francais sauf si on te parle anglais.',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages, mode = 'beginner', topic } = await req.json()
    if (!messages || !Array.isArray(messages)) throw new Error('messages requis')

    const systemBase = systemPrompts[mode] ?? systemPrompts['beginner']
    const systemFull = topic ? `${systemBase}\n\nSujet de la session : ${topic}` : systemBase

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemFull,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(`Anthropic ${response.status}: ${err?.error?.message ?? 'erreur'}`)
    }

    const data = await response.json()
    const text = data.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')

    return new Response(JSON.stringify({ reply: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
