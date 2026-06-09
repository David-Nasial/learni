// ─── Tableau de bord Étudiant ─────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Trophy, BookOpen, Clock, Hash } from 'lucide-react'
import { getResultsFromCloud, joinClassroom, updateProfile } from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'
import type { QuizResult } from '../types'

export function StudentDashboard() {
  const { user, profile, refreshProfile } = useAuth()
  const [results,    setResults]    = useState<QuizResult[]>([])
  const [classCode,  setClassCode]  = useState('')
  const [joinMsg,    setJoinMsg]    = useState('')
  const [joinError,  setJoinError]  = useState('')
  const [joining,    setJoining]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [editName,   setEditName]   = useState(false)
  const [name,       setName]       = useState(profile?.name ?? '')

  // Charger l'historique depuis Supabase (cloud)
  useEffect(() => {
    if (!user) return
    getResultsFromCloud(user.id).then(r => {
      setResults(r)
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    setName(profile?.name ?? '')
  }, [profile])

  const handleJoin = async () => {
    if (!user || !classCode.trim()) return
    setJoining(true); setJoinMsg(''); setJoinError('')
    try {
      await joinClassroom(user.id, classCode.trim())
      setJoinMsg(`✅ Vous avez rejoint la classe ! Code : ${classCode.toUpperCase()}`)
      setClassCode('')
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setJoining(false)
    }
  }

  const handleSaveName = async () => {
    if (!user || !name.trim()) return
    await updateProfile(user.id, { name: name.trim() })
    await refreshProfile()
    setEditName(false)
  }

  const avg = results.length
    ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)
    : 0
  const totalQ = results.reduce((a, r) => a + r.total, 0)
  const bestScore = results.length ? Math.max(...results.map(r => r.score)) : 0

  const scoreColor = (s: number) =>
    s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--gold)' : '#ef4444'

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* ── Profil rapide ────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--red)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0,
        }}>
          🎓
        </div>
        <div style={{ flex: 1 }}>
          {editName ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 6, color: 'var(--text)', padding: '6px 10px',
                  fontFamily: 'var(--font-body)', fontSize: 14,
                }}
              />
              <button onClick={handleSaveName} style={{
                padding: '6px 14px', background: 'var(--red)', border: 'none',
                borderRadius: 6, color: '#fff', fontSize: 13, fontFamily: 'var(--font-body)',
              }}>Sauvegarder</button>
              <button onClick={() => setEditName(false)} style={{
                padding: '6px 10px', background: 'none',
                border: '1px solid var(--border)', borderRadius: 6,
                color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-body)',
              }}>Annuler</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--white)' }}>
                {profile?.name ?? 'Étudiant'}
              </span>
              <button onClick={() => setEditName(true)} style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
              }}>
                Modifier
              </button>
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{user?.email}</p>
        </div>
        {/* Badge plan */}
        <div style={{
          padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: profile?.plan === 'pro' ? '#2d1b69' : 'var(--bg3)',
          border: `1px solid ${profile?.plan === 'pro' ? '#4a3080' : 'var(--border)'}`,
          color: profile?.plan === 'pro' ? '#a78bfa' : 'var(--muted)',
        }}>
          {profile?.plan === 'pro' ? '✨ Pro' : '🆓 Gratuit'}
        </div>
      </div>

      {/* ── Stats globales ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
        {[
          { icon: <BookOpen size={18} />, n: results.length, l: 'Quiz complétés' },
          { icon: <Trophy size={18} />,   n: `${avg}%`,      l: 'Score moyen' },
          { icon: <Hash size={18} />,     n: totalQ,         l: 'Questions' },
          { icon: <Clock size={18} />,    n: `${bestScore}%`,l: 'Meilleur score' },
        ].map(s => (
          <div key={s.l} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '.9rem', textAlign: 'center',
          }}>
            <div style={{ color: 'var(--red)', display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--white)' }}>{s.n}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── Historique cloud ──────────────────────────────────────────── */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: '1rem' }}>
            📊 Historique de mes quiz
          </h3>

          {loading ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Chargement depuis le cloud…</p>
          ) : results.length === 0 ? (
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '2.5rem', textAlign: 'center', color: 'var(--muted)',
            }}>
              <p style={{ fontSize: '2rem', marginBottom: '.75rem' }}>📭</p>
              <p style={{ fontSize: 14 }}>Aucun quiz complété pour l'instant.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Vos résultats s'afficheront ici après chaque quiz.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {results.map(r => (
                <div key={r.id} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '.9rem 1.1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 2 }}>{r.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>{r.date} · {r.total} questions</p>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-head)', fontSize: '1.15rem',
                    fontWeight: 700, color: scoreColor(r.score),
                  }}>
                    {r.score}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Rejoindre une classe ──────────────────────────────────────── */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: '1rem' }}>
            🏫 Rejoindre une classe
          </h3>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '1.25rem',
          }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Entrez le code donné par votre professeur pour rejoindre la classe et partager vos résultats.
            </p>
            <input
              placeholder="Code (ex: ABC123)"
              value={classCode}
              onChange={e => setClassCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 8,
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)',
                fontFamily: 'monospace', fontSize: 15, letterSpacing: 2,
                boxSizing: 'border-box', textTransform: 'uppercase',
              }}
            />
            <button onClick={handleJoin} disabled={joining || !classCode.trim()} style={{
              width: '100%', padding: '10px 0',
              background: 'var(--red)', border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
              opacity: joining || !classCode.trim() ? .5 : 1,
            }}>
              {joining ? 'Rejoindre…' : 'Rejoindre la classe'}
            </button>
            {joinMsg   && <p style={{ fontSize: 13, color: 'var(--green)', marginTop: 8 }}>{joinMsg}</p>}
            {joinError && <p style={{ fontSize: 13, color: '#f87171',     marginTop: 8 }}>{joinError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
