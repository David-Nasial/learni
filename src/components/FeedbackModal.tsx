// ─── FeedbackModal — retour utilisateur (bug, idée, autre) ───────────────────
import { useState } from 'react'
import { X, Bug, Lightbulb, MessageSquare, Loader, CheckCircle, Star } from 'lucide-react'
import { sendFeedback } from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'

type Kind = 'bug' | 'idea' | 'other'

const KINDS: { id: Kind; label: string; icon: typeof Bug }[] = [
  { id: 'bug',   label: 'Un problème', icon: Bug },
  { id: 'idea',  label: 'Une idée',    icon: Lightbulb },
  { id: 'other', label: 'Autre',       icon: MessageSquare },
]

export function FeedbackModal({ page, onClose }: { page?: string; onClose: () => void }) {
  const { user, profile } = useAuth()
  const [kind,    setKind]    = useState<Kind>('idea')
  const [message, setMessage] = useState('')
  const [rating,  setRating]  = useState(0)
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSend = async () => {
    if (!user || !message.trim() || sending) return
    setSending(true); setError('')
    try {
      await sendFeedback(user.id, profile?.email, kind, message.trim(), rating || undefined, page)
      setSent(true)
      setTimeout(onClose, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible — réessaie.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg2)', border: '1px solid #4a3080', borderRadius: 20,
          width: '100%', maxWidth: 440, padding: '1.75rem', position: 'relative',
        }}
      >
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)',
        }}>
          <X size={14} />
        </button>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle size={40} style={{ color: 'var(--green)', marginBottom: '1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--white)', marginBottom: '.4rem' }}>
              Merci !
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6 }}>
              Ton retour est bien enregistré — il nous aide à améliorer LearnI.
            </p>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.35rem' }}>
              Donne ton avis
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Un bug, une idée, une remarque ? Dis-nous tout — on lit chaque message.
            </p>

            {/* Type de retour */}
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
              {KINDS.map(k => {
                const Icon = k.icon
                const active = kind === k.id
                return (
                  <button
                    key={k.id}
                    onClick={() => setKind(k.id)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                      background: active ? '#2d1b69' : 'var(--bg3)',
                      border: `1px solid ${active ? '#a78bfa' : 'var(--border)'}`,
                      color: active ? '#a78bfa' : 'var(--muted)',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    <Icon size={16} />
                    {k.label}
                  </button>
                )
              })}
            </div>

            <textarea
              autoFocus
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Décris ce que tu as remarqué ou ce que tu aimerais voir…"
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '11px 13px', color: 'var(--text)', fontSize: 14,
                fontFamily: 'inherit', lineHeight: 1.6, marginBottom: '1rem',
              }}
            />

            {/* Note optionnelle */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
                Ton avis global sur LearnI <span style={{ color: '#555' }}>(optionnel)</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRating(rating === n ? 0 : n)}
                    title={`${n} / 5`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                  >
                    <Star
                      size={20}
                      style={{ color: n <= rating ? 'var(--gold)' : '#3a4358' }}
                      fill={n <= rating ? 'var(--gold)' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: '9px 12px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: message.trim() && !sending ? 'var(--purple)' : '#333',
                color: message.trim() && !sending ? '#fff' : '#777',
                fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700,
                cursor: message.trim() && !sending ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {sending ? <><Loader size={15} className="spin" /> Envoi…</> : 'Envoyer mon retour'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
