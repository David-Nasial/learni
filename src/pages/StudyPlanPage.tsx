import { useState, useEffect } from 'react'
import { Calendar, Trash2, CheckCircle, Circle, Loader, Plus, BookOpen } from 'lucide-react'
import {
  generateAndSaveStudyPlan, getStudyPlan, toggleStudyItem, deleteStudyPlan,
  getResultsFromCloud, getClassroomResources,
  type StudyPlan, type StudyPlanItem,
} from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
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

export function StudyPlanPage() {
  const { user, profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin'
  const isSchoolStudent = profile?.role === 'student'
  const hasAccess = isSuperadmin || ['pro', 'autodidacte', 'teacher'].includes(profile?.plan ?? '') || profile?.role === 'teacher' || isSchoolStudent

  const [plan,      setPlan]      = useState<StudyPlan | null>(null)
  const [items,     setItems]     = useState<StudyPlanItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [generating,setGenerating]= useState(false)
  const [error,     setError]     = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [goal,      setGoal]      = useState('')
  const [examDate,  setExamDate]  = useState('')

  useEffect(() => {
    if (!user) return
    loadPlan()
  }, [user])

  const loadPlan = async () => {
    if (!user) return
    setLoading(true)
    const result = await getStudyPlan(user.id)
    if (result) { setPlan(result.plan); setItems(result.items) }
    setLoading(false)
  }

  const handleGenerate = async () => {
    if (!user || !goal.trim()) return
    setGenerating(true)
    setError('')
    try {
      const results   = await getResultsFromCloud(user.id)
      const resources = isSchoolStudent ? await getClassroomResources(user.id) : []
      const result    = await generateAndSaveStudyPlan(user.id, goal.trim(), examDate || null, results, resources)
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

  if (!hasAccess) {
    return (
      <div className="fade-in" style={{ maxWidth: 560, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <Calendar size={48} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', color: 'var(--white)', marginBottom: '.5rem' }}>
          Calendrier d'étude IA
        </h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Disponible avec le plan <strong style={{ color: 'var(--red)' }}>Pro</strong> ou <strong style={{ color: '#a78bfa' }}>Autodidacte</strong>.
        </p>
      </div>
    )
  }

  // Stats
  const todayItems  = items.filter(i => isToday(i.date))
  const doneCount   = items.filter(i => i.done).length
  const totalCount  = items.length
  const progress    = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
      <Loader size={32} style={{ color: 'var(--muted)' }} className="spin" />
    </div>
  )

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--white)' }}>
            📅 Mon calendrier d'étude
          </h2>
          {plan && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 3 }}>Objectif : {plan.goal}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '1rem', fontSize: '1rem' }}>
            ✨ Générer mon plan d'étude
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Quel est ton objectif ?
              </label>
              <input
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="ex: Préparer mon examen de mathématiques de fin d'année"
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
                Date de l'examen (optionnel)
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
                border: 'none', borderRadius: 8, color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
              }}>
                {generating ? <><Loader size={16} className="spin" /> L'IA génère votre plan…</> : '✨ Générer le plan'}
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

      {/* Pas de plan */}
      {!plan && !showForm && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '3rem 2rem', textAlign: 'center',
        }}>
          <BookOpen size={48} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '.5rem' }}>
            Aucun plan d'étude
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.5rem' }}>
            L'IA va analyser tes résultats et créer un planning personnalisé jour par jour.
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
          {/* Progression */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem', marginBottom: '1.5rem',
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

          {/* Barre de progression */}
          <div style={{ background: 'var(--bg3)', borderRadius: 8, height: 8, marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--purple), var(--red))', borderRadius: 8, transition: 'width .5s' }} />
          </div>

          {/* Today highlight */}
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

          {/* Tous les items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => {
              const today   = isToday(item.date)
              const past    = isPast(item.date)
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
