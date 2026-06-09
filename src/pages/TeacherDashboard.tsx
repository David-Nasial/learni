// ─── Tableau de bord Enseignant ───────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Plus, Copy, Users, BarChart2, BookOpen, CheckCircle } from 'lucide-react'
import {
  createClassroom, getTeacherClassrooms, getClassroomResults,
  type Classroom, type StudentResult,
} from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'

export function TeacherDashboard() {
  const { user, profile } = useAuth()
  const [classrooms,   setClassrooms]   = useState<Classroom[]>([])
  const [selected,     setSelected]     = useState<Classroom | null>(null)
  const [results,      setResults]      = useState<StudentResult[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [creating,     setCreating]     = useState(false)
  const [copied,       setCopied]       = useState('')
  const [loading,      setLoading]      = useState(true)

  // Charger les classes
  useEffect(() => {
    if (!user) return
    getTeacherClassrooms(user.id).then(cls => {
      setClassrooms(cls)
      if (cls.length > 0) selectClass(cls[0])
      setLoading(false)
    })
  }, [user])

  const selectClass = async (cls: Classroom) => {
    setSelected(cls)
    const r = await getClassroomResults(cls.id)
    setResults(r)
  }

  const handleCreate = async () => {
    if (!user || !newClassName.trim()) return
    setCreating(true)
    try {
      const cls = await createClassroom(user.id, newClassName.trim())
      const updated = [cls, ...classrooms]
      setClassrooms(updated)
      setSelected(cls)
      setResults([])
      setNewClassName('')
    } finally {
      setCreating(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(''), 2000)
  }

  // Stats de la classe sélectionnée
  const avgScore = results.length
    ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)
    : 0
  const uniqueStudents = [...new Set(results.map(r => r.student_id))].length

  if (loading) return <LoadingState />

  if (!profile || (profile.plan === 'free' && profile.role !== 'superadmin')) return <UpgradeState />

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--white)', marginBottom: '1.75rem' }}>
        👩‍🏫 Tableau de bord — Enseignant
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem' }}>

        {/* ── Colonne gauche : liste des classes ─────────────────────────── */}
        <div>
          {/* Créer une classe */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '1rem', marginBottom: '1rem',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>
              Nouvelle classe
            </p>
            <input
              placeholder="Nom de la classe…"
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{
                width: '100%', padding: '9px 12px',
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)',
                fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
            <button onClick={handleCreate} disabled={creating || !newClassName.trim()} style={{
              width: '100%', padding: '9px 0',
              background: 'var(--red)', border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: creating || !newClassName.trim() ? .5 : 1,
            }}>
              <Plus size={14} /> {creating ? 'Création…' : 'Créer la classe'}
            </button>
          </div>

          {/* Liste des classes */}
          {classrooms.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>
              Aucune classe encore.
            </p>
          ) : (
            classrooms.map(cls => (
              <button key={cls.id} onClick={() => selectClass(cls)} style={{
                width: '100%', textAlign: 'left', marginBottom: 6,
                padding: '11px 14px', borderRadius: 10,
                background: selected?.id === cls.id ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${selected?.id === cls.id ? 'var(--red)' : 'var(--border)'}`,
                color: 'var(--text)', fontFamily: 'var(--font-body)',
              }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{cls.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 6,
                    background: 'var(--bg)', color: 'var(--muted)',
                    fontFamily: 'monospace', letterSpacing: 1,
                  }}>
                    {cls.code}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); copyCode(cls.code) }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}
                  >
                    {copied === cls.code ? <CheckCircle size={13} color="var(--green)" /> : <Copy size={13} />}
                  </button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* ── Colonne droite : détails de la classe ──────────────────────── */}
        <div>
          {!selected ? (
            <EmptyClassState />
          ) : (
            <>
              {/* Entête classe */}
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
              }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', color: 'var(--white)', marginBottom: 4 }}>
                    {selected.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Code élève :</span>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 15, fontWeight: 700,
                      color: 'var(--white)', letterSpacing: 2,
                      background: 'var(--bg3)', padding: '2px 10px', borderRadius: 6,
                    }}>
                      {selected.code}
                    </span>
                    <button onClick={() => copyCode(selected.code)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                      {copied === selected.code ? <CheckCircle size={15} color="var(--green)" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 300 }}>
                  Partagez ce code à vos élèves. Ils entrent le code dans leur profil pour rejoindre la classe.
                </p>
              </div>

              {/* Stats rapides */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.75rem', marginBottom: '1rem' }}>
                {[
                  { icon: <Users size={18} />,     n: uniqueStudents, l: 'Élèves actifs' },
                  { icon: <BookOpen size={18} />,  n: results.length, l: 'Quiz complétés' },
                  { icon: <BarChart2 size={18} />, n: `${avgScore}%`, l: 'Score moyen' },
                ].map(s => (
                  <div key={s.l} style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '1rem', textAlign: 'center',
                  }}>
                    <div style={{ color: 'var(--red)', display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--white)' }}>{s.n}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Tableau des résultats élèves */}
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                  <h4 style={{ fontFamily: 'var(--font-head)', fontSize: '.95rem', color: 'var(--white)' }}>
                    Résultats des élèves
                  </h4>
                </div>

                {results.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    Aucun élève n'a encore complété de quiz dans cette classe.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Élève', 'Quiz', 'Score', 'Total', 'Date'].map(h => (
                            <th key={h} style={{
                              padding: '10px 14px', textAlign: 'left',
                              color: 'var(--muted)', fontWeight: 600, fontSize: 12,
                              textTransform: 'uppercase', letterSpacing: '.5px',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '11px 14px', color: 'var(--text)' }}>
                              <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.student_email}</div>
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--muted)' }}>{r.title}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{
                                fontFamily: 'var(--font-head)', fontWeight: 700,
                                color: r.score >= 80 ? 'var(--green)' : r.score >= 60 ? 'var(--gold)' : '#ef4444',
                              }}>
                                {r.score}%
                              </span>
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--muted)' }}>{r.total} q.</td>
                            <td style={{ padding: '11px 14px', color: 'var(--muted)' }}>{r.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sous-composants ────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
      <div className="spin" style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--red)', margin: '0 auto 1rem' }} />
      Chargement…
    </div>
  )
}

function UpgradeState() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</p>
      <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '.5rem' }}>
        Tableau de bord Enseignant
      </h3>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.5rem' }}>
        Passez au plan Enseignant (29$/mois/classe) pour gérer vos classes et suivre vos élèves.
      </p>
    </div>
  )
}

function EmptyClassState() {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '3rem', textAlign: 'center', color: 'var(--muted)',
    }}>
      <p style={{ fontSize: '2rem', marginBottom: '.75rem' }}>📋</p>
      <p>Sélectionnez une classe ou créez-en une nouvelle.</p>
    </div>
  )
}
