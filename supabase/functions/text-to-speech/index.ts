// ─── Edge Function : text-to-speech ───────────────────────────────────────────
// Synthèse vocale via OpenAI TTS (voix IA — Mon Cartable, plans Pro/Autodidacte).
// Découpe le texte pour rester sous la limite de 4096 caractères par requête
// OpenAI, puis concatène les segments audio en un seul fichier MP3.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const DEFAULT_VOICE = 'nova'
const VALID_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
const MAX_CHUNK = 3900

const corsHeaders = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function chunkText(text: string, maxLen = MAX_CHUNK): string[] {
  const paragraphs = text.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ''

  const flush = () => { if (current.trim()) chunks.push(current.trim()); current = '' }

  for (const raw of paragraphs) {
    const para = raw.trim()
    if (!para) continue

    if (para.length > maxLen) {
      // Paragraphe trop long : découper par phrases
      const sentences = para.split(/(?<=[.!?])\s+/)
      for (const sentence of sentences) {
        if ((current + ' ' + sentence).trim().length > maxLen) {
          flush()
          current = sentence
        } else {
          current = current ? `${current} ${sentence}` : sentence
        }
      }
    } else if ((current + '\n\n' + para).trim().length > maxLen) {
      flush()
      current = para
    } else {
      current = current ? `${current}\n\n${para}` : para
    }
  }
  flush()

  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)]
}

async function synthesizeChunk(text: string, voice: string): Promise<Uint8Array> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ model: 'tts-1', voice, input: text, response_format: 'mp3' }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI TTS ${response.status}: ${err.slice(0, 300)}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, voice: requestedVoice } = await req.json()

    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: 'Texte manquant.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const voice = VALID_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE

    // Plafond raisonnable (~15-20 min de lecture) pour rester sous les limites
    // de temps d'exécution et de coût par génération.
    const capped = text.trim().slice(0, 25000)
    const chunks  = chunkText(capped)
    // Synthétiser tous les morceaux EN PARALLÈLE plutôt qu'un par un — un
    // document en plusieurs chunks dépassait sinon le temps d'exécution max.
    const buffers = await Promise.all(chunks.map(chunk => synthesizeChunk(chunk, voice)))

    const totalLen = buffers.reduce((a, b) => a + b.length, 0)
    const combined = new Uint8Array(totalLen)
    let offset = 0
    for (const b of buffers) { combined.set(b, offset); offset += b.length }

    return new Response(combined, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
