import React from 'react'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, GraduationCap, BookOpen, Trophy } from 'lucide-react'
import { callTutor } from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'
import type { TutorMode, TutorMessage } from '../types'

const MODES: { id: TutorMode; label: string; desc: string; icon: React.ReactElement; color: string }[] = [
  { id: 'beginner', label: 'Mode Débutant',       desc: 'Explications simples et analogies',     icon: <BookOpen size={16} />,     color: '#22c55e' },
  { id: 'teacher',  label: 'Mode Professeur',     desc: 'Strict, formel, niveau académique',     icon: <GraduationCap size={16} />, color: '#3b82f6' },
  { id: 'exam',     label: 'Mode Examen',         desc: 'Questions et score, comme un vrai exam', icon: <Trophy size={16} />,        color: '#f59e0b' },
]

const SUGGESTIONS = [
  'Explique-moi les réseaux de neurones simplement.',
  'Qu\'est-ce que la photosynthèse ?',
  'Résume la Révolution française en 5 points.',
  'Explique la loi d\'Ohm avec un exemple concret.',
  'C\'est quoi la différence entre ADN et ARN ?',
]

export function TutorPage() {
  const { profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin'
  const hasAccess = isSuperadmin || profile?.plan === 'autodidacte'  // Autodidacte ONLY

  const [mode,    setMode]    = useState<TutorMode>('beginner')
  const [topic,   setTopic]   = useState('')
  const [input,   setInput]   = useState('')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    setInput('')
    setError('')
    const newMessages: TutorMessage[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const reply = await callTutor(newMessages, mode, topic || undefined)
      setMessages([...newMessages, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const currentMode = MODES.find(m => m.id === mode)!

  if (!hasAccess) {
    return (
      <div className="fade-in" style={{ maxWidth: 560, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', color: 'var(--white)', marginBottom: '.5rem' }}>
          Tuteur IA conversationnel
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Le tuteur IA est disponible avec le plan <strong style={{ color: '#a78bfa' }}>Autodidacte</strong> ou <strong style={{ color: 'var(--red)' }}>Pro</strong>.
        </p>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', textAlign: 'left' }}>
          {['Explique-moi les réseaux de neurones simplement.', 'Pourquoi cette réponse est fausse ?', 'Mode professeur strict activé — interrogez-moi.', 'Simule un examen de mathématiques niveau terminale.'].map(ex => (
            <div key={ex} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: 13 }}>
              💬 {ex}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'flex', height: 'calc(100vh - 64px)', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Panneau gauche ─────────────────────────────────────────────────── */}
      <aside style={{
        width: 260, flexShrink: 0, padding: '1.25rem 1rem',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem',
        overflowY: 'auto',
      }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>Mode</p>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 10, marginBottom: 4,
              background: mode === m.id ? 'var(--bg3)' : 'transparent',
              border: `1px solid ${mode === m.id ? m.color : 'transparent'}`,
              color: mode === m.id ? 'var(--text)' : 'var(--muted)',
              textAlign: 'left', cursor: 'pointer',
            }}>
              <span style={{ color: m.color, marginTop: 1 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>Sujet (optionnel)</p>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="ex: Mathématiques Terminale"
            style={{
              width: '100%', padding: '9px 12px', background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setError('') }} style={{
            marginTop: 'auto', padding: '8px 12px', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
          }}>
            Nouvelle conversation
          </button>
        )}
      </aside>

      {/* ── Zone de chat ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header mode */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Bot size={20} style={{ color: currentMode.color }} />
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--white)', fontSize: 14 }}>
            Tuteur IA — {currentMode.label}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{currentMode.desc}</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <Bot size={48} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.5rem' }}>
                Pose ta première question ou choisis une suggestion :
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} style={{
                    padding: '8px 14px', background: 'var(--bg2)',
                    border: '1px solid var(--border)', borderRadius: 20,
                    color: 'var(--text)', fontSize: 13, cursor: 'pointer',
                    transition: 'border-color .2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = currentMode.color)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: msg.role === 'user' ? 'var(--red)' : 'var(--bg3)',
                border: msg.role === 'assistant' ? `1px solid ${currentMode.color}` : 'none',
                fontSize: 14,
              }}>
                {msg.role === 'user' ? '👤' : <Bot size={16} style={{ color: currentMode.color }} />}
              </div>
              <div style={{
                maxWidth: '72%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                background: msg.role === 'user' ? 'var(--red)' : 'var(--bg2)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                fontSize: 14, lineHeight: 1.65, color: 'var(--text)',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg3)', border: `1px solid ${currentMode.color}`,
              }}>
                <Bot size={16} style={{ color: currentMode.color }} />
              </div>
              <div style={{
                padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 4, alignItems: 'center',
              }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--muted)',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>
              ❌ {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pose ta question… (Entrée pour envoyer, Shift+Entrée pour aller à la ligne)"
              rows={2}
              style={{
                flex: 1, padding: '10px 14px', background: 'var(--bg2)',
                border: '1px solid var(--border)', borderRadius: 10,
                color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
                resize: 'none', lineHeight: 1.5,
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: input.trim() && !loading ? currentMode.color : 'var(--bg3)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'background .2s',
              }}
            >
              <Send size={18} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, textAlign: 'center' }}>
            Tuteur IA · LearnI
          </p>
        </div>
      </div>
    </div>
  )
}
