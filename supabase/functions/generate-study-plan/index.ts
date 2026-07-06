import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AgendaEvent {
  type:           'exam' | 'work' | 'busy' | 'study_slot'
  title:          string
  date:           string
  start_time?:    string
  end_time?:      string
  is_recurring:   boolean
  recurring_days?: number[]
  recurring_end?:  string
}

interface QuizResult {
  title:   string
  score:   number
  correct: number
  total:   number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { goal, examDate, results, startDate, resources, agendaEvents } = await req.json() as {
      goal:          string
      examDate?:     string
      results?:      QuizResult[]
      startDate?:    string
      resources?:    { name: string }[]
      agendaEvents?: AgendaEvent[]
    }

    // ── Résumé des résultats quiz ─────────────────────────────────────────────
    const resultsSummary = results?.length
      ? results.slice(0, 10).map(r =>
          `- ${r.title}: ${r.score}% (${r.correct}/${r.total} correctes)`
        ).join('\n')
      : 'Aucun résultat disponible.'

    const resourcesSummary = resources?.length
      ? '\nDocuments disponibles :\n' + resources.map(r => `- ${r.name}`).join('\n')
      : ''

    const start = startDate ?? new Date().toISOString().split('T')[0]
    const end = examDate ?? (() => {
      const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]
    })()

    // ── Résumé de l'agenda ────────────────────────────────────────────────────
    const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

    let agendaSummary = ''
    if (agendaEvents?.length) {
      const exams = agendaEvents.filter(e => e.type === 'exam')
      const work  = agendaEvents.filter(e => e.type === 'work')
      const busy  = agendaEvents.filter(e => e.type === 'busy')
      const slots = agendaEvents.filter(e => e.type === 'study_slot')

      if (exams.length) {
        agendaSummary += '\nDates d\'examens importants :\n' +
          exams.map(e => `- ${e.title} le ${e.date}${e.start_time ? ' à ' + e.start_time : ''}`).join('\n')
      }
      if (work.length) {
        agendaSummary += '\nJours/heures de travail (à ne PAS planifier d\'étude ou réduire) :\n'
        work.forEach(e => {
          if (e.is_recurring && e.recurring_days?.length) {
            const dayNames = e.recurring_days.map(d => DAYS_FR[d]).join(', ')
            agendaSummary += `- ${e.title}: chaque ${dayNames}${e.start_time ? ' de ' + e.start_time + ' à ' + (e.end_time ?? '?') : ''}\n`
          } else {
            agendaSummary += `- ${e.title} le ${e.date}${e.start_time ? ' de ' + e.start_time + ' à ' + (e.end_time ?? '?') : ''}\n`
          }
        })
      }
      if (busy.length) {
        agendaSummary += '\nJournées occupées (anniversaires, sorties, voyages — PAS d\'étude ce jour) :\n' +
          busy.map(e => `- ${e.title} le ${e.date}`).join('\n')
      }
      if (slots.length) {
        agendaSummary += '\nCréneaux préférés pour étudier :\n'
        slots.forEach(e => {
          if (e.is_recurring && e.recurring_days?.length) {
            const dayNames = e.recurring_days.map(d => DAYS_FR[d]).join(', ')
            agendaSummary += `- ${e.title}: chaque ${dayNames}${e.start_time ? ' de ' + e.start_time + ' à ' + (e.end_time ?? '?') : ''}\n`
          } else {
            agendaSummary += `- ${e.title} le ${e.date}${e.start_time ? ' de ' + e.start_time + ' à ' + (e.end_time ?? '?') : ''}\n`
          }
        })
      }
    }

    // ── Prompt ────────────────────────────────────────────────────────────────
    const prompt = `Tu es un coach scolaire expert en planification personnalisée. Génère un plan d'étude adapté.

Objectif : ${goal}
Date de début : ${start}
Date d'examen / fin : ${end}

Résultats récents de l'élève :
${resultsSummary}${resourcesSummary}

${agendaSummary ? 'Contraintes de l\'agenda de l\'élève :' + agendaSummary : ''}

Règles OBLIGATOIRES :
1. NE planifie AUCUNE séance les jours marqués "occupé" ou "travail" (sauf si un créneau study_slot existe le même jour).
2. Si des créneaux d'étude préférés sont indiqués (soirs, week-end, etc.), concentre les séances sur ces plages.
3. Les matières avec un score bas (<60%) reçoivent PLUS de séances (proportionnel à la faiblesse).
4. Les 2-3 jours avant chaque examen, intensifie la révision de la matière concernée.
5. Maximum 2h d'étude par jour, réparti en séances de 30-60 min.
6. Le dimanche = repos sauf si c'est un créneau study_slot explicite.
7. Alterne les matières pour éviter la fatigue mentale.

Génère le plan jour par jour du ${start} au ${end}.

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
Réponds UNIQUEMENT en JSON, sans markdown, sans texte avant ou après.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: 'Tu es un coach scolaire. Réponds UNIQUEMENT en JSON valide sans markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const aiData = await response.json()
    const raw = aiData.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
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
