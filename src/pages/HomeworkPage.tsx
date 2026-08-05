import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Send, Paperclip, Loader, PenTool, X, FileText } from 'lucide-react'
import {
  getHomeworkSessions, createHomeworkSession, deleteHomeworkSession,
  getHomeworkMessages, addHomeworkMessage, renameHomeworkSession, touchHomeworkSession,
  callTutor,
  type HomeworkSession, type HomeworkMessage,
} from '../utils/supabase'
import { extractText } from '../utils/pdfExtract'
import { useAuth } from '../hooks/useAuth'

// Pro pour l'instant — ajoute 'starter' ici (et dans Sidebar.tsx) si tu décides de l'inclure
const HOMEWORK_ALLOWED_PLANS = ['pro', 'teacher']

function relativeDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
}

export function HomeworkPage() {
  const { user, profile } = useAuth()
  const hasAccess = profile?.role === 'superadmin' || HOMEWORK_ALLOWED_PLANS.includes(profile?.plan ?? '')

  const [sessions,       setSessions]       = useState<HomeworkSession[]>([])
  const [activeSession,  setActiveSession]  = useState<HomeworkSession | null>(null)
  const [messages,       setMessages]       = useState<HomeworkMessage[]>([])
  const [input,          setInput]          = useState('')
  const [sending,        setSending]        = useState(false)
  const [loading,        setLoading]        = useState(true)
  const [loadingMessages,setLoadingMessages]= useState(false)
  const [error,          setError]          = useState('')

  const [pendingAttachment, setPendingAttachment] = useState<{ name: string; text: string } | null>(null)
  const [attaching, setAttaching] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user || !hasAccess) { setLoading(false); return }
    getHomeworkSessions(user.id).then(async list => {
      setSessions(list)
      if (list.length > 0) {
        setActiveSession(list[0])
        setLoadingMessages(true)
        try { setMessages(await getHomeworkMessages(list[0].id)) } catch { /* noop */ }
        setLoadingMessages(false)
      }
    }).catch(() => {}).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const openSession = async (s: HomeworkSession) => {
    setActiveSession(s)
    setError('')
    setLoadingMessages(true)
    try { setMessages(await getHomeworkMessages(s.id)) }
    catch { setError('Impossible de charger cette conversation.') }
    finally { setLoadingMessages(false) }
  }

  const handleNewSession = () => {
    setActiveSession(null)
    setMessages([])
    setError('')
    setPendingAttachment(null)
  }

  const handleDeleteSession = async (s: HomeworkSession, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette conversation ?')) return
    await deleteHomeworkSession(s.id)
    setSessions(prev => prev.filter(x => x.id !== s.id))
    if (activeSession?.id === s.id) { setActiveSession(null); setMessages([]) }
  }

  const handleAttach = async (file: File) => {
    setAttaching(true); setError('')
    try {
      const text = await extractText(file)
      setPendingAttachment({ name: file.name, text })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de lire ce fichier.')
    } finally {
      setAttaching(false)
    }
  }

  const handleSend = async () => {
    if (!user || sending) return
    if (!input.trim() && !pendingAttachment) return

    setError('')
    const isFirstMessage = messages.length === 0
    const attachment = pendingAttachment

    const content = attachment
      ? `📎 Pièce jointe : "${attachment.name}"\n---\n${attachment.text.slice(0, 6000)}\n---\n\n${input.trim()}`.trim()
      : input.trim()

    setInput('')
    setPendingAttachment(null)
    setSending(true)

    try {
      let session = activeSession
      if (!session) {
        session = await createHomeworkSession(user.id)
        setSessions(prev => [session!, ...prev])
        setActiveSession(session)
      }

      const userMsg = await addHomeworkMessage(session.id, 'user', content, attachment?.name)
      const historyForAI = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      setMessages(prev => [...prev, userMsg])

      const reply = await callTutor(historyForAI, 'homework')
      const assistantMsg = await addHomeworkMessage(session.id, 'assistant', reply)
      setMessages(prev => [...prev, assistantMsg])

      if (isFirstMessage) {
        const title = (input.trim() || attachment?.name || 'Nouvelle conversation').slice(0, 50)
        await renameHomeworkSession(session.id, title)
        setSessions(prev => prev.map(s => s.id === session!.id ? { ...s, title } : s))
        setActiveSession(s => s ? { ...s, title } : s)
      } else {
        await touchHomeworkSession(session.id)
        setSessions(prev => {
          const updated = prev.map(s => s.id === session!.id ? { ...s, updated_at: new Date().toISOString() } : s)
          return updated.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur — réessaie.')
    } finally {
      setSending(false)
    }
  }

  if (!hasAccess) {
    return (
      <div className="fade-in" style={{ maxWidth: 560, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <PenTool size={48} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', color: 'var(--white)', marginBottom: '.5rem' }}>Aide aux devoirs</h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Disponible avec le plan <strong style={{ color: '#f87171' }}>Pro</strong>.<br />
          Prends une photo de ton exercice ou décris ton problème — le tuteur IA t'aide à comprendre et à résoudre, étape par étape.
        </p>
      </div>
    )
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
      <Loader size={32} style={{ color: 'var(--muted)' }} className="spin" />
    </div>
  )

  return (
    <div className="fade-in" style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Sidebar conversations */}
      <aside style={{
        width: 280, flexShrink: 0, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <PenTool size={18} style={{ color: 'var(--purple-l)' }} />
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '.95rem' }}>Aide aux devoirs</span>
          </div>
          <button onClick={handleNewSession} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px', background: 'var(--purple)', border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={15} /> Nouvelle conversation
          </button>
        </div>

        <div style={{ flex: 1, padding: '.5rem' }}>
          {sessions.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 12.5, padding: '.75rem', lineHeight: 1.5 }}>
              Aucune conversation pour l'instant.
            </p>
          )}
          {sessions.map(s => (
            <div key={s.id} onClick={() => openSession(s)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
              background: activeSession?.id === s.id ? 'var(--bg3)' : 'transparent',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, color: activeSession?.id === s.id ? 'var(--white)' : 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{relativeDate(s.updated_at)}</div>
              </div>
              <button onClick={e => handleDeleteSession(s, e)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loadingMessages ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader size={26} className="spin" style={{ color: 'var(--muted)' }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 420, padding: '1rem' }}>
              <PenTool size={40} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
              <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '.5rem' }}>Pose ta question</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                Décris ton exercice, ou joins une photo/PDF de ton devoir avec 📎 — le tuteur t'explique le raisonnement, étape par étape.
              </p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: m.role === 'user' ? 'var(--purple)' : 'var(--bg2)',
                border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '12px 15px', fontSize: 14, lineHeight: 1.65, color: m.role === 'user' ? '#fff' : 'var(--text)',
                whiteSpace: 'pre-wrap',
              }}>
                {m.attachment_name && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5,
                    color: m.role === 'user' ? 'rgba(255,255,255,.75)' : 'var(--muted)',
                    marginBottom: 6, fontWeight: 600,
                  }}>
                    <Paperclip size={12} /> {m.attachment_name}
                  </div>
                )}
                {m.content}
              </div>
            ))
          )}
          {sending && (
            <div style={{
              alignSelf: 'flex-start', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px',
              padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 1s infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 1s .2s infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 1s .4s infinite' }} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div style={{ margin: '0 2rem .75rem', padding: '8px 12px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>
            {error}
          </div>
        )}

        {pendingAttachment && (
          <div style={{
            margin: '0 2rem .5rem', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', background: '#2d1b69', border: '1px solid #4a3080', borderRadius: 8,
            fontSize: 12.5, color: '#a78bfa',
          }}>
            <FileText size={14} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingAttachment.name}</span>
            <button onClick={() => setPendingAttachment(null)} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        )}

        <div style={{ padding: '1rem 2rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input
            ref={fileInputRef} type="file" accept=".pdf,.txt,.md,image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleAttach(f); e.target.value = '' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={attaching}
            title="Joindre une photo ou un PDF"
            style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              color: 'var(--muted)', cursor: attaching ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {attaching ? <Loader size={16} className="spin" /> : <Paperclip size={16} />}
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Décris ton exercice ou ta question…"
            rows={1}
            style={{
              flex: 1, resize: 'none', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 10,
              padding: '11px 14px', color: 'var(--text)', fontSize: 14,
              fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
            }}
          />
          <button
            onClick={handleSend} disabled={(!input.trim() && !pendingAttachment) || sending}
            style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0, border: 'none',
              background: (input.trim() || pendingAttachment) && !sending ? 'var(--purple)' : '#333',
              cursor: (input.trim() || pendingAttachment) && !sending ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Send size={17} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  )
}
