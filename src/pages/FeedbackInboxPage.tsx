// ─── Retours utilisateurs — réservé au Super Admin ───────────────────────────
import { useState, useEffect } from 'react'
import { Loader, Bug, Lightbulb, MessageSquare, Star, CheckCircle, Circle, Inbox } from 'lucide-react'
import { getAllFeedback, setFeedbackHandled, type AppFeedback } from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'

type Filter = 'all' | 'todo' | 'bug' | 'idea'

const KIND_META: Record<string, { label: string; icon: typeof Bug; color: string; bg: string }> = {
  bug:   { label: 'Problème', icon: Bug,           color: '#f87171', bg: '#2a0f0f' },
  idea:  { label: 'Idée',     icon: Lightbulb,     color: 'var(--gold)', bg: '#2a1f00' },
  other: { label: 'Autre',    icon: MessageSquare, color: '#a78bfa', bg: '#2d1b69' },
}

export function FeedbackInboxPage() {
  const { profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin' || profile?.true_role === 'superadmin'

  const [items,   setItems]   = useState<AppFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<Filter>('all')
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!isSuperadmin) { setLoading(false); return }
    getAllFeedback()
      .then(setItems)
      .catch(err => setError(err instanceof Error ? err.message : 'Chargement impossible.'))
      .finally(() => setLoading(false))
  }, [isSuperadmin])

  const toggleHandled = async (item: AppFeedback) => {
    const next = !item.handled
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, handled: next } : i))
    try { await setFeedbackHandled(item.id, next) } catch { /* affichage déjà à jour */ }
  }

  if (!isSuperadmin) {
    return (
      <div className="fade-in" style={{ maxWidth: 520, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <Inbox size={44} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', color: 'var(--white)', marginBottom: '.5rem' }}>
          Retours utilisateurs
        </h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>Cette page est réservée à l'administration.</p>
      </div>
    )
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
      <Loader size={30} className="spin" style={{ color: 'var(--muted)' }} />
    </div>
  )

  const visible = items.filter(i =>
    filter === 'all'  ? true :
    filter === 'todo' ? !i.handled :
    i.kind === filter
  )
  const pending = items.filter(i => !i.handled).length
  const rated   = items.filter(i => i.rating)
  const avgRating = rated.length
    ? (rated.reduce((a, i) => a + (i.rating ?? 0), 0) / rated.length).toFixed(1)
    : null

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all',  label: `Tous (${items.length})` },
    { id: 'todo', label: `À traiter (${pending})` },
    { id: 'bug',  label: 'Problèmes' },
    { id: 'idea', label: 'Idées' },
  ]

  return (
    <div className="fade-in" style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.2rem' }}>
            Retours utilisateurs
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            {items.length} retour{items.length > 1 ? 's' : ''} · {pending} à traiter
          </p>
        </div>
        {avgRating && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
          }}>
            <Star size={16} style={{ color: 'var(--gold)' }} fill="var(--gold)" />
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, color: 'var(--white)', fontSize: '1.1rem', lineHeight: 1 }}>
                {avgRating}<span style={{ fontSize: 12, color: 'var(--muted)' }}>/5</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{rated.length} avis</div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              background: filter === f.id ? 'var(--purple)' : 'var(--bg2)',
              border: `1px solid ${filter === f.id ? 'var(--purple)' : 'var(--border)'}`,
              color: filter === f.id ? '#fff' : 'var(--muted)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3rem 2rem',
          background: 'var(--bg2)', border: '2px dashed var(--border)', borderRadius: 18,
        }}>
          <Inbox size={40} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Aucun retour dans cette catégorie.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {visible.map(item => {
            const meta = KIND_META[item.kind] ?? KIND_META.other
            const Icon = meta.icon
            return (
              <div key={item.id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
                padding: '1rem 1.25rem', opacity: item.handled ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '.6rem', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                    background: meta.bg, color: meta.color,
                  }}>
                    <Icon size={12} /> {meta.label}
                  </span>
                  {item.rating && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--gold)' }}>
                      <Star size={12} fill="var(--gold)" /> {item.rating}/5
                    </span>
                  )}
                  {item.page && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>page : {item.page}</span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
                    {new Date(item.created_at).toLocaleDateString('fr-CA')}
                  </span>
                </div>

                <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: '.6rem' }}>
                  {item.message}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.email ?? 'Anonyme'}</span>
                  <button
                    onClick={() => toggleHandled(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: 'transparent',
                      border: `1px solid ${item.handled ? 'var(--border)' : '#1a4a3a'}`,
                      color: item.handled ? 'var(--muted)' : '#6ee7b7',
                    }}
                  >
                    {item.handled
                      ? <><Circle size={12} /> Rouvrir</>
                      : <><CheckCircle size={12} /> Marquer traité</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
