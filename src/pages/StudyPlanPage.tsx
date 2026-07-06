// ─── StudyPlanPage — LearnI ───────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import {
  Calendar, Trash2, CheckCircle, Circle, Loader, Plus, BookOpen,
  X, ChevronRight, Repeat, Clock,
} from 'lucide-react'
import {
  generateAndSaveStudyPlan, getStudyPlan, toggleStudyItem, deleteStudyPlan,
  getResultsFromCloud, getClassroomResources,
  getAgendaEvents, createAgendaEvent, deleteAgendaEvent,
  type StudyPlan, type StudyPlanItem, type AgendaEvent, type AgendaEventInsert,
} from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_FR   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split('T')[0]
}

function isPast(dateStr: string) {
  return dateStr < new Date().toISOString().split('T')[0]
}

// ─── Config des types d'événements ───────────────────────────────────────────

const EVENT_TYPES: Record<AgendaEvent['type'], { label: string; emoji: string; color: string; bg: string; border: string }> = {
  exam:       { label: 'Examen',         emoji: '📝', color: '#f87171', bg: '#2a0f0f', border: '#4a1515' },
  work:       { label: 'Travail',         emoji: '💼', color: '#fbbf24', bg: '#2a1a00', border: '#4a3000' },
  busy:       { label: 'Journée occupée', emoji: '🚫', color: '#94a3b8', bg: '#1a1f2e', border: '#2a3050' },
  study_slot: { label: 'Créneau dispo',   emoji: '📖', color: '#a78bfa', bg: '#2d1b69', border: '#4a3080' },
}

// ─── Formulaire d'ajout d'événement ──────────────────────────────────────────

interface AddEventFormProps {
  userId:   string
  onSave:   (event: AgendaEvent) => void
  onCancel: () => void
}

function AddEventForm({ userId, onSave, onCancel }: AddEventFormProps) {
  const [type,          setType]         = useState<AgendaEvent['type']>('exam')
  const [title,         setTitle]        = useState('')
  const [date,          setDate]         = useState('')
  const [startTime,     setStartTime]    = useState('')
  const [endTime,       setEndTime]      = useState('')
  const [isRecurring,   setIsRecurring]  = useState(false)
  const [recurDays,     setRecurDays]    = useState<number[]>([])
  const [recurEnd,      setRecurEnd]     = useState('')
  const [saving,        setSaving]       = useState(false)
  const [error,         setError]        = useState('')

  const today = new Date().toISOString().split('T')[0]

  const toggleDay = (d: number) => setRecurDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleSave = async () => {
    if (!title.trim()) { setError('Entrez un titre'); return }
    if (!isRecurring && !date) { setError('Choisissez une date'); return }
    if (isRecurring && recurDays.length === 0) { setError('Choisissez au moins un jour'); return }
    setSaving(true)
    setError('')
    try {
      const insert: AgendaEventInsert = {
        user_id:        userId,
        type,
        title:          title.trim(),
        date:           isRecurring ? (recurEnd || today) : date,
        start_time:     startTime || undefined,
        end_time:       endTime   || undefined,
        is_recurring:   isRecurring,
        recurring_days: isRecurring ? recurDays : undefined,
        recurring_end:  isRecurring && recurEnd ? recurEnd : undefined,
      }
      const saved = await createAgendaEvent(insert)
      onSave(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const cfg = EVENT_TYPES[type]

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '1.5rem', marginBottom: '1.25rem',
    }}>
      <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', fontSize: '1rem', marginBottom: '1rem' }}>
        ➕ Ajouter un événement
      </h3>

      {/* Type */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: '1rem' }}>
        {(Object.keys(EVENT_TYPES) as AgendaEvent['type'][]).map(t => {
          const c = EVENT_TYPES[t]
          return (
            <button key={t} onClick={() => setType(t)} style={{
              padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: type === t ? c.bg : 'var(--bg3)',
              border: `1px solid ${type === t ? c.border : 'var(--border)'}`,
              color: type === t ? c.color : 'var(--muted)',
              cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{c.emoji}</div>
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Titre */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={
          type === 'exam'       ? 'ex: Mathématiques 11e année' :
          type === 'work'       ? 'ex: Shift Tim Hortons' :
          type === 'busy'       ? 'ex: Anniversaire de Sophie' :
                                  'ex: Soirées disponibles'
        }
        style={{
          width: '100%', padding: '10px 14px', background: 'var(--bg3)',
          border: '1px solid var(--border)', borderRadius: 8,
          color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
          boxSizing: 'border-box', marginBottom: '1rem',
        }}
      />

      {/* Récurrent ? */}
      {(type === 'work' || type === 'study_slot') && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13, marginBottom: '1rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
          <Repeat size={14} /> Récurrent (chaque semaine)
        </label>
      )}

      {/* Jours de la semaine (si récurrent) */}
      {isRecurring && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
          {DAYS_FR.map((day, i) => (
            <button key={i} onClick={() => toggleDay(i)} style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: recurDays.includes(i) ? cfg.bg : 'var(--bg3)',
              border: `1px solid ${recurDays.includes(i) ? cfg.border : 'var(--border)'}`,
              color: recurDays.includes(i) ? cfg.color : 'var(--muted)',
              cursor: 'pointer',
            }}>
              {day}
            </button>
          ))}
        </div>
      )}

      {/* Date (si non récurrent) */}
      {!isRecurring && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Date</label>
          <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} style={{
            padding: '9px 12px', background: 'var(--bg3)',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
          }} />
        </div>
      )}

      {/* Heures */}
      {(type !== 'busy') && (
        <div style={{ display: 'flex', gap: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Début
            </label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{
              padding: '8px 12px', background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text)', fontSize: 14,
            }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Fin
            </label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{
              padding: '8px 12px', background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text)', fontSize: 14,
            }} />
          </div>
          {isRecurring && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Fin de la récurrence</label>
              <input type="date" value={recurEnd} min={today} onChange={e => setRecurEnd(e.target.value)} style={{
                padding: '8px 12px', background: 'var(--bg3)',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text)', fontSize: 14,
              }} />
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: '8px 12px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '10px 20px', background: cfg.border,
          border: 'none', borderRadius: 8, color: cfg.color,
          fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          {saving ? <Loader size={14} className="spin" style={{ display: 'inline' }} /> : 'Enregistrer'}
        </button>
        <button onClick={onCancel} style={{
          padding: '10px 16px', background: 'transparent',
          border: '1px solid var(--border)', borderRadius: 8,
          color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
        }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── Onglet Mon Agenda ────────────────────────────────────────────────────────

interface AgendaTabProps {
  userId:  string
  events:  AgendaEvent[]
  onAdd:   (e: AgendaEvent) => void
  onDelete:(id: string)     => void
}

function AgendaTab({ userId, events, onAdd, onDelete }: AgendaTabProps) {
  const [showForm, setShowForm] = useState(false)

  const handleSave = (e: AgendaEvent) => { onAdd(e); setShowForm(false) }

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))

  const grouped = sorted.reduce<Record<AgendaEvent['type'], AgendaEvent[]>>(
    (acc, ev) => { acc[ev.type].push(ev); return acc },
    { exam: [], work: [], busy: [], study_slot: [] }
  )

  return (
    <div>
      {/* Bouton ajouter */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', background: 'var(--purple)',
          border: 'none', borderRadius: 10, color: '#fff',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem',
        }}>
          <Plus size={16} /> Ajouter un événement
        </button>
      )}

      {showForm && (
        <AddEventForm userId={userId} onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {events.length === 0 && !showForm && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '3rem 2rem', textAlign: 'center',
        }}>
          <Calendar size={48} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '.5rem' }}>
            Ton agenda est vide
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
            Ajoute tes examens, tes journées de travail, tes sorties et tes créneaux d'étude.
            L'IA en tiendra compte pour générer ton plan.
          </p>
        </div>
      )}

      {/* Liste groupée par type */}
      {(Object.keys(EVENT_TYPES) as AgendaEvent['type'][]).map(t => {
        const group = grouped[t]
        if (!group.length) return null
        const cfg = EVENT_TYPES[t]
        return (
          <div key={t} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{cfg.emoji}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: cfg.color, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {cfg.label}s
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 20 }}>
                {group.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.map(ev => (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', borderRadius: 10,
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: cfg.color }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {ev.is_recurring && ev.recurring_days?.length
                        ? `Chaque ${ev.recurring_days.map(d => DAYS_FR[d]).join(', ')}${ev.start_time ? ' · ' + ev.start_time + (ev.end_time ? '–' + ev.end_time : '') : ''}`
                        : formatDate(ev.date) + (ev.start_time ? ' · ' + ev.start_time + (ev.end_time ? '–' + ev.end_time : '') : '')}
                      {ev.is_recurring && ev.recurring_end ? ` jusqu'au ${formatDate(ev.recurring_end)}` : ''}
                      {ev.is_recurring && <span style={{ marginLeft: 6, color: cfg.color }}><Repeat size={10} style={{ display: 'inline' }} /></span>}
                    </div>
                  </div>
                  <button onClick={() => onDelete(ev.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                    padding: 4, borderRadius: 4,
                  }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Onglet Mon Plan d'étude ──────────────────────────────────────────────────

interface PlanTabProps {
  userId:    string
  events:    AgendaEvent[]
  isStudent: boolean
}

function PlanTab({ userId, events, isStudent }: PlanTabProps) {
  const [plan,       setPlan]       = useState<StudyPlan | null>(null)
  const [items,      setItems]      = useState<StudyPlanItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [goal,       setGoal]       = useState('')
  const [examDate,   setExamDate]   = useState('')

  useEffect(() => { loadPlan() }, [userId])

  const loadPlan = async () => {
    setLoading(true)
    const result = await getStudyPlan(userId)
    if (result) { setPlan(result.plan); setItems(result.items) }
    setLoading(false)
  }

  const handleGenerate = async () => {
    if (!goal.trim()) return
    setGenerating(true)
    setError('')
    try {
      const results   = await getResultsFromCloud(userId)
      const resources = isStudent ? await getClassroomResources(userId) : []
      const result    = await generateAndSaveStudyPlan(userId, goal.trim(), examDate || null, results, resources, events)
      setPlan(result.plan)
      setItems(result.items)
      setShowForm(false)
      setGoal('')
      setExamDate('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setGenerating(false)
    }
  }

  const handleToggle = async (item: StudyPlanItem) => {
    await toggleStudyItem(item.id, !item.done)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i))
  }

  const handleDelete = async () => {
    if (!plan || !confirm('Supprimer ce plan d\'étude ?')) return
    await deleteStudyPlan(plan.id)
    setPlan(null)
    setItems([])
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
      <Loader size={28} style={{ color: 'var(--muted)' }} className="spin" />
    </div>
  )

  const todayItems = items.filter(i => isToday(i.date))
  const doneCount  = items.filter(i => i.done).length
  const totalCount = items.length
  const progress   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const examEvents = events.filter(e => e.type === 'exam')

  return (
    <div>
      {/* Boutons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {plan && (
          <button onClick={handleDelete} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', background: 'transparent',
            border: '1px solid #3a1515', borderRadius: 8,
            color: '#f87171', fontSize: 13, cursor: 'pointer',
          }}>
            <Trash2 size={14} /> Supprimer
          </button>
        )}
        <button onClick={() => setShowForm(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', background: 'var(--red)',
          border: 'none', borderRadius: 8,
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={14} /> {plan ? 'Nouveau plan' : 'Créer un plan'}
        </button>
      </div>

      {/* Rappel si agenda vide */}
      {events.length === 0 && !plan && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: '#2a1a00', border: '1px solid #4a3000', borderRadius: 10,
          marginBottom: '1.25rem',
        }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div>
            <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: 13 }}>Conseil</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>
              Remplis d'abord l'onglet <strong>Mon Agenda</strong> avec tes examens et disponibilités
              pour que l'IA génère un plan vraiment adapté à ton emploi du temps.
            </div>
          </div>
        </div>
      )}

      {/* Examens à venir */}
      {examEvents.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem',
        }}>
          {examEvents.map(e => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', background: '#2a0f0f', border: '1px solid #4a1515',
              borderRadius: 20, fontSize: 12, color: '#f87171',
            }}>
              📝 {e.title} — {formatDate(e.date)}
            </div>
          ))}
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '1rem', fontSize: '1rem' }}>
            ✨ Générer mon plan d'étude
          </h3>
          {events.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              background: '#1a2d1a', border: '1px solid #2a4a2a', borderRadius: 8,
              color: '#86efac', fontSize: 13, marginBottom: '1rem',
            }}>
              <CheckCircle size={14} /> {events.length} événement{events.length > 1 ? 's' : ''} d'agenda seront pris en compte
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Quel est ton objectif principal ?
              </label>
              <input
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="ex: Préparer mon examen de mathématiques 11e année Ontario"
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg3)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Date limite (optionnel — si pas dans l'agenda)
              </label>
              <input
                type="date"
                value={examDate}
                onChange={e => setExamDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  padding: '10px 14px', background: 'var(--bg3)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
                }}
              />
            </div>
            {error && (
              <div style={{ padding: '8px 12px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleGenerate} disabled={!goal.trim() || generating} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', background: generating ? 'var(--bg3)' : 'var(--purple)',
                border: 'none', borderRadius: 8, color: generating ? 'var(--muted)' : '#fff',
                fontSize: 14, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
              }}>
                {generating ? <><Loader size={16} className="spin" /> L'IA génère ton plan…</> : '✨ Générer le plan'}
              </button>
              <button onClick={() => setShowForm(false)} style={{
                padding: '10px 16px', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--muted)', fontSize: 14, cursor: 'pointer',
              }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* État vide */}
      {!plan && !showForm && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '3rem 2rem', textAlign: 'center',
        }}>
          <BookOpen size={48} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '.5rem' }}>
            Aucun plan d'étude
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.5rem', maxWidth: 380, margin: '0 auto .75rem' }}>
            L'IA va analyser tes résultats de quiz et ton agenda pour créer un planning sur-mesure.
          </p>
          <button onClick={() => setShowForm(true)} style={{
            padding: '12px 28px', background: 'var(--purple)',
            border: 'none', borderRadius: 10, color: '#fff',
            fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            ✨ Créer mon plan d'étude
          </button>
        </div>
      )}

      {/* Plan existant */}
      {plan && items.length > 0 && (
        <>
          {plan.goal && <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: '1rem' }}>Objectif : {plan.goal}</p>}

          {/* Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem', marginBottom: '1rem',
          }}>
            {[
              { label: 'Progression', value: `${progress}%`, color: progress >= 80 ? 'var(--green)' : progress >= 40 ? 'var(--gold)' : 'var(--red)' },
              { label: 'Séances complétées', value: `${doneCount}/${totalCount}`, color: 'var(--text)' },
              { label: "Aujourd'hui", value: todayItems.length > 0 ? `${todayItems.length} séance${todayItems.length > 1 ? 's' : ''}` : 'Repos 😌', color: 'var(--text)' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '1rem 1.25rem',
              }}>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.5rem', color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Barre */}
          <div style={{ background: 'var(--bg3)', borderRadius: 8, height: 8, marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--purple), var(--red))', borderRadius: 8, transition: 'width .5s' }} />
          </div>

          {/* Aujourd'hui */}
          {todayItems.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #1a1033, #2d1b69)',
              border: '1px solid #4a3080', borderRadius: 16,
              padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
                📌 Aujourd'hui
              </div>
              {todayItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <button onClick={() => handleToggle(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', flexShrink: 0 }}>
                    {item.done
                      ? <CheckCircle size={20} style={{ color: 'var(--green)' }} />
                      : <Circle size={20} style={{ color: '#a78bfa' }} />}
                  </button>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--white)', fontSize: 15 }}>{item.subject}</div>
                    <div style={{ color: '#c4b5fd', fontSize: 13, marginTop: 2 }}>{item.description}</div>
                    <div style={{ color: '#7c6ab0', fontSize: 12, marginTop: 4 }}>⏱ {item.duration_min} min</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Toutes les séances */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => {
              const today = isToday(item.date)
              const past  = isPast(item.date)
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px', borderRadius: 12,
                  background: today ? 'var(--bg3)' : 'var(--bg2)',
                  border: `1px solid ${today ? 'var(--purple)' : 'var(--border)'}`,
                  opacity: past && !today ? 0.7 : 1,
                }}>
                  <button onClick={() => handleToggle(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', flexShrink: 0 }}>
                    {item.done
                      ? <CheckCircle size={18} style={{ color: 'var(--green)' }} />
                      : <Circle size={18} style={{ color: 'var(--muted)' }} />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 90 }}>{formatDate(item.date)}</span>
                      <span style={{
                        fontWeight: 600, fontSize: 14,
                        color: item.done ? 'var(--muted)' : 'var(--white)',
                        textDecoration: item.done ? 'line-through' : 'none',
                      }}>{item.subject}</span>
                      {today && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#2d1b69', color: '#a78bfa', fontWeight: 700 }}>AUJOURD'HUI</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{item.description}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{item.duration_min} min</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function StudyPlanPage() {
  const { user, profile } = useAuth()
  const isSuperadmin  = profile?.role === 'superadmin'
  const isSchoolStudent = profile?.role === 'student'
  const hasAccess = isSuperadmin
    || ['pro', 'autodidacte', 'teacher'].includes(profile?.plan ?? '')
    || profile?.role === 'teacher'
    || isSchoolStudent

  const [tab,    setTab]    = useState<'agenda' | 'plan'>('agenda')
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  useEffect(() => {
    if (!user) return
    getAgendaEvents(user.id)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoadingEvents(false))
  }, [user])

  const handleAdd    = (e: AgendaEvent)  => setEvents(prev => [...prev, e])
  const handleDelete = async (id: string) => {
    await deleteAgendaEvent(id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  if (!hasAccess) {
    return (
      <div className="fade-in" style={{ maxWidth: 560, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <Calendar size={48} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', color: 'var(--white)', marginBottom: '.5rem' }}>
          Plan d'étude IA
        </h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Disponible avec le plan <strong style={{ color: 'var(--red)' }}>Pro</strong> ou <strong style={{ color: '#a78bfa' }}>Autodidacte</strong>.
        </p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--white)', marginBottom: '.25rem' }}>
          📅 Mon Plan d'étude
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Remplis ton agenda, puis génère un plan adapté à tes disponibilités et tes points faibles.
        </p>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: 'var(--bg2)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {[
          { key: 'agenda', label: '📆 Mon Agenda', icon: <Calendar size={14} /> },
          { key: 'plan',   label: '✨ Mon Plan',   icon: <ChevronRight size={14} /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'agenda' | 'plan')}
            style={{
              padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: tab === t.key ? 'var(--purple)' : 'transparent',
              border: 'none',
              color: tab === t.key ? '#fff' : 'var(--muted)',
              cursor: 'pointer', transition: 'all .2s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.label}
            {t.key === 'agenda' && events.length > 0 && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 20,
                background: tab === 'agenda' ? 'rgba(255,255,255,.2)' : '#2d1b69',
                color: tab === 'agenda' ? '#fff' : '#a78bfa',
                fontWeight: 700,
              }}>
                {events.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {loadingEvents ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <Loader size={28} style={{ color: 'var(--muted)' }} className="spin" />
        </div>
      ) : tab === 'agenda' ? (
        <AgendaTab userId={user.id} events={events} onAdd={handleAdd} onDelete={handleDelete} />
      ) : (
        <PlanTab userId={user.id} events={events} isStudent={isSchoolStudent} />
      )}

    </div>
  )
}
