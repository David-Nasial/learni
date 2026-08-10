// ─── Edge Function : text-to-speech ───────────────────────────────────────────
// Synthèse vocale via OpenAI TTS (voix IA — Mon Cartable, plans Pro/Autodidacte).
// Découpe le texte pour rester sous la limite de 4096 caractères par requête
// OpenAI, puis concatène les segments audio en un seul fichier MP3.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY    = Deno.env.get('OPENAI_API_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const DEFAULT_VOICE = 'nova'
const VALID_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
const MAX_CHUNK = 3900
// Chaque segment part dans son propre appel Claude (en parallèle) — reste large
// (~7000 car.) tout en gardant la sortie très en-dessous de sa limite de 8192 tokens.
const NARRATION_SEGMENT_LEN = 7000
// Plafond de sécurité global (~60-90 min de narration) pour couvrir un livre complet
// sans dépasser le temps d'exécution ni le coût d'une génération.
const MAX_TOTAL_LEN = 100000

const corsHeaders = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Nettoie les artefacts d'extraction (PDF/photo) que la voix prononcerait
// littéralement à tort — ex: "#1 Téléchargez…" lu comme "number 1 Téléchargez…".
function cleanForSpeech(text: string): string {
  return text
    .replace(/#(\d)/g, '$1')        // "#1" → "1" (le "#" seul est lu "number")
    .replace(/[*_~`]/g, '')         // résidus markdown (gras/italique/code)
    .replace(/[ \t]{2,}/g, ' ')
}

// Réécrit le texte en narration orale fluide via Claude — transforme les tables
// des matières / listes structurelles en introduction parlée, retire les
// anglicismes en français, et évite ainsi que la voix ne "divague" sur du
// contenu qui n'a pas la forme d'une prose normale.
async function prepareForNarration(text: string, language: string): Promise<string> {
  const lang = language === 'en' ? 'English' : 'français'
  const prompt = `
Tu prépares ce texte pour qu'il soit lu à voix haute par une synthèse vocale, en ${lang}.

Instructions :
- Réécris-le en phrases naturelles et fluides, comme une narration orale continue.
- Garde la structure PERCEPTIBLE à l'oreille : quand le texte passe d'un thème/titre à son contenu développé, marque clairement la transition à voix haute (ex: "Parlons maintenant de [thème]…", "Concernant [thème], …") plutôt que d'enchaîner titre et contenu sans distinction. L'auditeur doit sentir "ceci est un thème" puis "ceci est le développement de ce thème".
- Si le texte contient une table des matières, une liste de chapitres ou de points avec numéros de page ou points de suite ("...."), transforme-la en une introduction parlée naturelle qui énonce les sujets, SANS lire les numéros de page ni les symboles de mise en page.
- Retire toute mise en forme qui ne se lit pas bien à l'oral (astérisques, dièses, tirets de liste, numéros isolés).
- ${language === 'en' ? 'Keep the text in natural English.' : "N'utilise AUCUN anglicisme — uniquement du vocabulaire français naturel, même si le texte source en contient."}
- Ne retire AUCUNE information de fond du contenu, seulement la mise en forme inadaptée à l'oral.
- N'invente rien qui n'est pas dans le texte original.

Texte source :
---
${text}
---

Réponds UNIQUEMENT avec le texte prêt à être lu à voix haute, sans commentaire, sans introduction, sans guillemets.
`.trim()

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: 'Tu prépares des textes pour la narration audio. Réponds uniquement avec le texte final, sans balises markdown, sans commentaire.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) return text // en cas d'échec, on lit quand même le texte nettoyé de base

    const data = await response.json()

    // Réponse coupée net faute de place : la fin du segment manquerait à l'oral.
    // On préfère lire le texte d'origine en entier plutôt qu'une réécriture amputée.
    if (data.stop_reason === 'max_tokens') return text

    const narration = data.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
      .trim()
    if (!narration) return text

    // Garde-fou : la réécriture doit reformuler, pas résumer. Si la sortie est
    // nettement plus courte que l'entrée (condensée ou refus), on lit l'original.
    if (narration.length < text.length * 0.6) return text

    return narration
  } catch {
    return text
  }
}

// Découpe un long texte en segments (par paragraphes) pour que chacun tienne
// largement sous la limite de sortie d'un appel Claude — sans jamais couper le livre.
function splitIntoSegments(text: string, maxLen = NARRATION_SEGMENT_LEN): string[] {
  const paragraphs = text.split(/\n{2,}/)
  const segments: string[] = []
  let current = ''

  for (const raw of paragraphs) {
    const para = raw.trim()
    if (!para) continue
    if ((current + '\n\n' + para).trim().length > maxLen) {
      if (current) segments.push(current.trim())
      current = para.length > maxLen ? para.slice(0, maxLen) : para
    } else {
      current = current ? `${current}\n\n${para}` : para
    }
  }
  if (current) segments.push(current.trim())

  return segments.length > 0 ? segments : [text]
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

  const result = chunks.length > 0 ? chunks : [text]

  // Filet de sécurité : une "phrase" sans ponctuation (fréquent dans un PDF
  // extrait) peut dépasser la limite d'OpenAI — on la recoupe en force plutôt
  // que de laisser l'appel échouer et perdre le passage.
  const safe: string[] = []
  for (const chunk of result) {
    if (chunk.length <= maxLen) { safe.push(chunk); continue }
    for (let i = 0; i < chunk.length; i += maxLen) safe.push(chunk.slice(i, i + maxLen))
  }
  return safe
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
    const { text, voice: requestedVoice, language } = await req.json()

    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: 'Texte manquant.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const voice = VALID_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE

    const basicClean = cleanForSpeech(text.trim()).slice(0, MAX_TOTAL_LEN)
    const lang = language === 'en' ? 'en' : 'fr'

    // Le livre entier est découpé en segments préparés EN PARALLÈLE (jamais coupé) —
    // chaque segment reste sous la limite de sortie d'un appel Claude.
    const segments = splitIntoSegments(basicClean)
    const narratedSegments = await Promise.all(segments.map(seg => prepareForNarration(seg, lang)))
    const narrated = narratedSegments.join('\n\n')

    const chunks = chunkText(narrated)
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
