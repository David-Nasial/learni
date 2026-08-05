import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Upload, ChevronLeft, BookOpen, FileText, Loader,
         GraduationCap, AlertTriangle, CheckCircle, XCircle, RefreshCw, RotateCcw,
         Volume2, Pause, Play, StopCircle, Library, ChevronDown, ChevronUp,
         MessageCircle, Send, X, PenLine } from 'lucide-react'
import {
  getCahiers, createCahier, deleteCahier,
  getUAs, createUA, deleteUA,
  getDocuments, uploadDocument, deleteDocument,
  generateRevision, generateCahierSummary, generateUASummary, generateUARewrite,
  callTutor, getUANotes, addUANote, deleteUANote,
  type Cahier, type UA, type CartableDocument, type RevisionExercise, type RevisionResult,
  type CartableUnitLabel, type UANote,
} from '../utils/supabase'
import { extractText, extractTextFromImage } from '../utils/pdfExtract'
import { useAuth } from '../hooks/useAuth'

type View = 'list' | 'cahier' | 'ua' | 'revision' | 'read'
type RevMode = 'ua' | 'final'
type Lang = 'fr' | 'en'

// ─── Rendu du texte réécrit : annotations IA {{id|phrase}} + notes de l'élève ─
interface AnnotationRange {
  start: number
  end: number
  kind: 'ai' | 'student'
  id: string
  comment: string
}

// Parse les marqueurs IA d'un paragraphe brut, puis superpose les notes de l'élève
// (ancrées par recherche du passage exact) pour obtenir un texte affichable + la
// liste fusionnée des plages à surligner.
function buildParagraphRanges(rawPara: string, paraIndex: number, studentNotes: UANote[]) {
  const aiRegex = /\{\{(\d+)\|([^}]*)\}\}/g
  let displayText = ''
  const ranges: AnnotationRange[] = []
  let last = 0
  let m: RegExpExecArray | null
  aiRegex.lastIndex = 0
  while ((m = aiRegex.exec(rawPara))) {
    displayText += rawPara.slice(last, m.index)
    const start = displayText.length
    displayText += m[2]
    const end = displayText.length
    ranges.push({ start, end, kind: 'ai', id: m[1], comment: '' })
    last = m.index + m[0].length
  }
  displayText += rawPara.slice(last)

  const paraNotes = studentNotes.filter(n => n.kind === 'inline' && n.paragraph_index === paraIndex && n.anchor_text)
  for (const note of paraNotes) {
    const idx = displayText.indexOf(note.anchor_text!)
    if (idx === -1) continue // passage introuvable (contenu régénéré depuis) — on l'ignore proprement
    ranges.push({ start: idx, end: idx + note.anchor_text!.length, kind: 'student', id: note.id, comment: note.content })
  }

  return { displayText, ranges }
}

const PARA_STYLE: React.CSSProperties = { marginBottom: '1.15rem', lineHeight: 1.85, color: 'var(--text)', fontSize: 15 }

function renderParagraph(
  displayText: string, ranges: AnnotationRange[], paraIndex: number,
  aiComments: Record<string, string>,
  openId: string | null, setOpenId: (id: string | null) => void,
  onDeleteStudentNote: (id: string) => void
) {
  if (ranges.length === 0) {
    return <p key={paraIndex} data-para={paraIndex} style={PARA_STYLE}>{displayText}</p>
  }

  const points = new Set<number>([0, displayText.length])
  ranges.forEach(r => { points.add(r.start); points.add(r.end) })
  const sorted = Array.from(points).sort((a, b) => a - b)

  const segments: { text: string; covering: AnnotationRange[] }[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const segStart = sorted[i], segEnd = sorted[i + 1]
    if (segStart >= segEnd) continue
    const covering = ranges.filter(r => r.start <= segStart && r.end >= segEnd)
    segments.push({ text: displayText.slice(segStart, segEnd), covering })
  }

  return (
    <p key={paraIndex} data-para={paraIndex} style={PARA_STYLE}>
      {segments.map((seg, i) => {
        if (seg.covering.length === 0) return <span key={i}>{seg.text}</span>
        const hasStudent = seg.covering.some(c => c.kind === 'student')
        return (
          <span key={i} style={{ position: 'relative' }}>
            <span style={{ background: hasStudent ? '#3a2e12' : '#2d1b69', borderRadius: 4, padding: '1px 3px' }}>{seg.text}</span>
            {seg.covering.map(r => {
              const key = `${paraIndex}-${r.kind}-${r.id}`
              const isOpen = openId === key
              const color = r.kind === 'student' ? '#f5a623' : '#a78bfa'
              const commentText = r.kind === 'ai' ? (aiComments[r.id] ?? '') : r.comment
              return (
                <span key={key} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : key)}
                    title="Voir le commentaire"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: '0 2px', verticalAlign: 'middle', display: 'inline-flex' }}
                  >
                    <MessageCircle size={14} />
                  </button>
                  {isOpen && (
                    <span style={{
                      position: 'absolute', bottom: '100%', left: 0, zIndex: 50, marginBottom: 6,
                      background: 'var(--bg2)', border: `1px solid ${r.kind === 'student' ? '#6b4a12' : '#4a3080'}`, borderRadius: 10,
                      padding: '.7rem .9rem', fontSize: 13, lineHeight: 1.5, color: 'var(--text)',
                      width: 260, boxShadow: '0 8px 30px rgba(0,0,0,.5)', display: 'block',
                    }}>
                      {commentText}
                      {r.kind === 'student' && (
                        <button
                          onClick={() => { onDeleteStudentNote(r.id); setOpenId(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12, padding: 0 }}
                        >
                          <Trash2 size={12} /> Supprimer ma note
                        </button>
                      )}
                    </span>
                  )}
                </span>
              )
            })}
          </span>
        )
      })}
    </p>
  )
}

function renderRewrittenContent(
  text: string,
  aiComments: Record<string, string>,
  studentNotes: UANote[],
  openId: string | null, setOpenId: (id: string | null) => void,
  onDeleteStudentNote: (id: string) => void
) {
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim())
  return paragraphs.map((para, pi) => {
    const { displayText, ranges } = buildParagraphRanges(para, pi, studentNotes)
    return renderParagraph(displayText, ranges, pi, aiComments, openId, setOpenId, onDeleteStudentNote)
  })
}

function stripAnnotationMarkers(text: string): string {
  return text.replace(/\{\{\d+\|([^}]*)\}\}/g, '$1')
}

// ─── Libellé UA / Chapitre (choisi par cahier) ───────────────────────────────
function unitTitle(cahier: Cahier | null | undefined, number: number): string {
  return cahier?.unit_label === 'Chapitre' ? `Chapitre ${number}` : `UA${number}`
}
function unitNoun(cahier: Cahier | null | undefined, count = 1): string {
  const isChap = cahier?.unit_label === 'Chapitre'
  if (isChap) return count > 1 ? 'Chapitres' : 'Chapitre'
  return count > 1 ? 'UAs' : 'UA'
}
function addUnitButtonLabel(cahier: Cahier | null | undefined): string {
  return cahier?.unit_label === 'Chapitre' ? 'Ajouter un chapitre' : 'Ajouter une UA'
}
function thisUnitPhrase(cahier: Cahier | null | undefined): string {
  return cahier?.unit_label === 'Chapitre' ? 'ce chapitre' : 'cette UA'
}
function noUnitYetPhrase(cahier: Cahier | null | undefined): string {
  return cahier?.unit_label === 'Chapitre' ? 'Aucun chapitre pour l\'instant.' : 'Aucune UA pour l\'instant.'
}

// ─── Tuteur IA flottant (contexte : contenu du Cartable en cours de lecture) ─
interface TutorMsg { role: 'user' | 'assistant'; content: string }

function CartableTutor({ title, content }: { title: string; content: string }) {
  const [open,    setOpen]    = useState(false)
  const [msgs,    setMsgs]    = useState<TutorMsg[]>([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: TutorMsg = { role: 'user', content: text }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setLoading(true)
    try {
      const context = `Cours : "${title}"\n\nContenu : ${content.slice(0, 2000)}`
      const reply = await callTutor(history, 'beginner', context)
      setMsgs([...history, { role: 'assistant', content: reply }])
    } catch {
      setMsgs([...history, { role: 'assistant', content: "Désolé, une erreur s'est produite. Réessaie." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="Tuteur IA"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 200,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? '#333' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(139,92,246,.5)',
          transition: 'background .2s, transform .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
      >
        {open ? <X size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 96, right: 28, zIndex: 199,
          width: 'min(380px, calc(100vw - 40px))', height: 460,
          background: 'var(--bg2)', border: '1px solid #4a3080',
          borderRadius: 18, display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,.5)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px', background: 'linear-gradient(135deg, #1a1033, #1a1033)',
            borderBottom: '1px solid #4a3080', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            }}>🤖</div>
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: 14 }}>Tuteur IA</div>
              <div style={{ fontSize: 11, color: '#a78bfa' }}>Je connais ce cours — pose-moi tes questions !</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.length === 0 && (
              <div style={{ margin: 'auto', textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>👋</div>
                <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
                  Je lis ce cours avec toi.<br />
                  Pose-moi n'importe quelle question sur <strong style={{ color: 'var(--white)' }}>"{title}"</strong>.
                </p>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? 'var(--purple)' : 'var(--bg3)',
                border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                padding: '10px 13px', fontSize: 13, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start', background: 'var(--bg3)',
                border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px',
                padding: '10px 14px', display: 'flex', gap: 5, alignItems: 'center',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 1s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 1s .2s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 1s .4s infinite' }} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Pose ta question…"
              rows={1}
              style={{
                flex: 1, resize: 'none', background: 'var(--bg3)',
                border: '1px solid var(--border)', borderRadius: 10,
                padding: '8px 12px', color: 'var(--text)', fontSize: 13,
                fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto',
              }}
            />
            <button
              onClick={send} disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: input.trim() && !loading ? 'var(--purple)' : '#333',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Panneau flottant "Mes notes" (miroir du tuteur, côté gauche) ────────────
function NotesPanel({ notes, onAddGeneral, generalDraft, setGeneralDraft, saving, onDelete }: {
  notes: UANote[]
  onAddGeneral: () => void
  generalDraft: string
  setGeneralDraft: (v: string) => void
  saving: boolean
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const generalNotes = notes.filter(n => n.kind === 'general')
  const inlineNotes  = notes.filter(n => n.kind === 'inline')

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="Mes notes"
        style={{
          position: 'fixed', bottom: 28, left: 28, zIndex: 200,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? '#333' : 'linear-gradient(135deg, #d97706, #f5a623)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(245,166,35,.4)',
          transition: 'background .2s, transform .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
      >
        {open ? <X size={22} color="#fff" /> : <PenLine size={22} color="#fff" />}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 96, left: 28, zIndex: 199,
          width: 'min(380px, calc(100vw - 40px))', height: 460,
          background: 'var(--bg2)', border: '1px solid #6b4a12',
          borderRadius: 18, display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,.5)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px', background: 'linear-gradient(135deg, #2a1f00, #2a1f00)',
            borderBottom: '1px solid #6b4a12',
          }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: 14 }}>📝 Mes notes</div>
            <div style={{ fontSize: 11, color: '#f5a623' }}>Tes annotations personnelles sur cette UA</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Ajouter une note générale */}
            <div>
              <textarea
                value={generalDraft}
                onChange={e => setGeneralDraft(e.target.value)}
                placeholder="Écris ta compréhension, un résumé perso…"
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none', background: 'var(--bg3)',
                  border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px',
                  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', marginBottom: 6,
                }}
              />
              <button
                onClick={onAddGeneral} disabled={!generalDraft.trim() || saving}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: generalDraft.trim() ? '#f5a623' : '#333',
                  color: generalDraft.trim() ? '#2a1f00' : '#777',
                  fontSize: 12.5, fontWeight: 700, cursor: generalDraft.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                + Ajouter la note
              </button>
            </div>

            {generalNotes.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Notes générales</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {generalNotes.map(n => (
                    <div key={n.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                      <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 4 }}>{n.content}</p>
                      <button onClick={() => onDelete(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11, padding: 0 }}>
                        <Trash2 size={11} /> Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inlineNotes.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Annotations dans le texte</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {inlineNotes.map(n => (
                    <div key={n.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                      <p style={{ fontSize: 11.5, color: '#f5a623', fontStyle: 'italic', marginBottom: 4 }}>« {n.anchor_text} »</p>
                      <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 4 }}>{n.content}</p>
                      <button onClick={() => onDelete(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11, padding: 0 }}>
                        <Trash2 size={11} /> Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {notes.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6 }}>
                Sélectionne un passage du texte pour y ajouter une annotation, ou écris une note générale ci-dessus.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

// ─── Composant correction après réponse ──────────────────────────────────────
function ExerciseCorrection({ exercise, selected, onNext }: {
  exercise: RevisionExercise
  selected: number
  onNext: () => void
}) {
  const isCorrect = selected === exercise.answerIndex

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Résultat */}
      <div style={{
        padding: '1rem 1.25rem', borderRadius: 12, marginBottom: '1rem',
        background: isCorrect ? '#0f2318' : '#2a0f0f',
        border: `1px solid ${isCorrect ? '#1a4a3a' : '#4a1515'}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {isCorrect
          ? <CheckCircle size={20} style={{ color: '#6ee7b7', flexShrink: 0 }} />
          : <XCircle size={20} style={{ color: '#f87171', flexShrink: 0 }} />}
        <div>
          <div style={{ fontWeight: 700, color: isCorrect ? '#6ee7b7' : '#f87171', fontSize: 14 }}>
            {isCorrect ? 'Bonne réponse !' : `Mauvaise réponse — La bonne réponse était : "${exercise.choices[exercise.answerIndex]}"`}
          </div>
        </div>
      </div>

      {/* Explication de la bonne réponse */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>
          ✅ Pourquoi c'est correct
        </div>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>{exercise.correctExplanation}</p>
      </div>

      {/* Explication des mauvais choix (seulement si réponse incorrecte) */}
      {!isCorrect && exercise.wrongExplanations[String(selected)] && (
        <div style={{ background: '#1a0f0f', border: '1px solid #4a1515', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: 12, color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>
            ❌ Pourquoi ta réponse est incorrecte
          </div>
          <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>
            {exercise.wrongExplanations[String(selected)]}
          </p>
        </div>
      )}

      {/* Points d'attention */}
      {exercise.attentionPoints?.length > 0 && (
        <div style={{ background: '#1a1500', border: '1px solid #4a3a00', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={13} /> À ne pas oublier
          </div>
          {exercise.attentionPoints.map((pt, i) => (
            <p key={i} style={{ fontSize: 13, color: '#fef3c7', lineHeight: 1.6, marginBottom: i < exercise.attentionPoints.length - 1 ? '.4rem' : 0 }}>
              • {pt}
            </p>
          ))}
        </div>
      )}

      <button onClick={onNext} style={{
        width: '100%', padding: '12px', borderRadius: 10,
        background: 'var(--purple)', border: 'none', color: '#fff',
        fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
      }}>
        Question suivante →
      </button>
    </div>
  )
}

// ─── Vue révision ─────────────────────────────────────────────────────────────
function RevisionView({ cahier, targetUA, mode, lang, onBack }: {
  cahier: Cahier
  targetUA: UA | null
  mode: RevMode
  lang: Lang
  onBack: () => void
}) {
  const [result,    setResult]    = useState<RevisionResult | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [exIdx,     setExIdx]     = useState(0)
  const [selected,  setSelected]  = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [score,     setScore]     = useState(0)
  const [answered,  setAnswered]  = useState(0)
  const [done,      setDone]      = useState(false)
  const [allSeen,   setAllSeen]   = useState<{ question: string }[]>([])

  const fetchRevision = useCallback(async (existing: { question: string }[] = []) => {
    setLoading(true); setError('')
    try {
      const uas = cahier.uas ?? []
      const targetUAs = mode === 'ua' && targetUA
        ? uas.filter(u => u.id === targetUA.id)
        : uas

      const uaData = await Promise.all(targetUAs.map(async u => {
        const docs = u.documents ?? []
        const content = docs.map(d => d.text_content).join('\n\n')
        return { number: u.number, label: u.label, content }
      }))

      const res = await generateRevision(mode, cahier.name, uaData, 10, lang, existing, cahier.unit_label)
      setResult(res)
      setExIdx(0); setSelected(null); setConfirmed(false); setDone(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération.')
    } finally {
      setLoading(false)
    }
  }, [cahier, targetUA, mode, lang])

  useEffect(() => { fetchRevision() }, [fetchRevision])

  const handleConfirm = () => {
    if (selected === null || !result) return
    const ex = result.exercises[exIdx]
    setConfirmed(true)
    setAnswered(a => a + 1)
    if (selected === ex.answerIndex) setScore(s => s + 1)
    setAllSeen(prev => [...prev, { question: ex.question }])
  }

  const handleNext = () => {
    if (!result) return
    if (exIdx < result.exercises.length - 1) {
      setExIdx(i => i + 1)
      setSelected(null)
      setConfirmed(false)
    } else {
      setDone(true)
    }
  }

  const handleNewSeries = () => fetchRevision(allSeen)
  const handleSameSeries = () => {
    setExIdx(0); setSelected(null); setConfirmed(false); setDone(false)
    setScore(0); setAnswered(0)
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <Loader size={36} className="spin" style={{ color: 'var(--purple)' }} />
      <p style={{ color: 'var(--muted)', fontSize: 15 }}>
        {mode === 'final' ? 'Génération de l\'examen final…' : `Génération révision ${unitTitle(cahier, targetUA?.number ?? 0)}…`}
      </p>
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: 600, margin: '3rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <div style={{ padding: '1rem', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 10, color: '#f87171', marginBottom: '1rem' }}>{error}</div>
      <button onClick={onBack} style={{ padding: '10px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>← Retour</button>
    </div>
  )

  if (!result) return null

  const ex = result.exercises[exIdx]

  // ── Résultats finaux ─────────────────────────────────────────────────────────
  if (done) {
    const pct = Math.round((score / answered) * 100)
    return (
      <div style={{ maxWidth: 580, margin: '2rem auto', padding: '0 1.5rem' }} className="fade-in">
        <div style={{
          background: 'linear-gradient(135deg, #1a1033, #1a1033)',
          border: '1px solid #4a3080', borderRadius: 20, padding: '2.5rem 2rem', textAlign: 'center',
          marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {pct >= 80 ? '🏆' : pct >= 60 ? '📈' : '💪'}
          </div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.5rem' }}>
            {score} / {answered} bonnes réponses
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.5rem' }}>
            {pct >= 80 ? 'Excellent travail ! Tu maîtrises bien ce contenu.' : pct >= 60 ? 'Bon effort ! Encore un peu de révision.' : 'Continue à réviser — tu progresses !'}
          </p>
          <div style={{
            background: 'var(--bg3)', borderRadius: 8, height: 10, overflow: 'hidden', marginBottom: '1.5rem',
          }}>
            <div style={{
              height: '100%', borderRadius: 8, width: `${pct}%`,
              background: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : 'var(--red)',
              transition: 'width .5s ease',
            }} />
          </div>
        </div>

        {/* Points d'attention globaux */}
        {result.globalAttentionPoints?.length > 0 && (
          <div style={{ background: '#1a1500', border: '1px solid #4a3a00', borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700, marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={15} /> Points importants à retenir
            </div>
            {result.globalAttentionPoints.map((pt, i) => (
              <p key={i} style={{ fontSize: 13, color: '#fef3c7', lineHeight: 1.6, marginBottom: '.4rem' }}>• {pt}</p>
            ))}
          </div>
        )}

        {/* Choix : même série ou nouvelle */}
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, marginBottom: '1rem' }}>
          Tu veux continuer à t'entraîner ?
        </p>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button onClick={handleSameSeries} style={{
            flex: 1, padding: '12px', borderRadius: 10,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <RotateCcw size={15} /> Même série
          </button>
          <button onClick={handleNewSeries} style={{
            flex: 1, padding: '12px', borderRadius: 10,
            background: 'var(--purple)', border: 'none',
            color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <RefreshCw size={15} /> Nouvelle série
          </button>
        </div>
        <button onClick={onBack} style={{
          width: '100%', marginTop: '.75rem', padding: '10px', borderRadius: 8,
          background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
        }}>
          ← Retour au cahier
        </button>
      </div>
    )
  }

  // ── Question en cours ────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '2rem 1.5rem' }} className="fade-in">
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={15} /> Retour
        </button>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: 14 }}>
          {mode === 'final' ? '🏁 Examen final' : `📖 Révision ${unitTitle(cahier, targetUA?.number ?? 0)}`} — {cahier.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{exIdx + 1} / {result.exercises.length}</div>
      </div>

      {/* Barre progression */}
      <div style={{ background: 'var(--bg2)', borderRadius: 4, height: 4, marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          background: 'linear-gradient(90deg, var(--purple), var(--red))',
          width: `${((exIdx + 1) / result.exercises.length) * 100}%`,
          transition: 'width .3s',
        }} />
      </div>

      {/* Tag UA */}
      {ex.uaTag && (
        <span style={{ fontSize: 11, padding: '3px 10px', background: '#2d1b69', color: '#a78bfa', borderRadius: 20, fontWeight: 600, display: 'inline-block', marginBottom: '1rem' }}>
          {ex.uaTag}
        </span>
      )}

      {/* Question */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
        <p style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--white)', lineHeight: 1.5 }}>
          {ex.question}
        </p>
      </div>

      {/* Choix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1rem' }}>
        {ex.choices.map((choice, i) => {
          let bg = 'var(--bg2)', border = 'var(--border)', color = 'var(--text)'
          if (confirmed) {
            if (i === ex.answerIndex) { bg = '#0f2318'; border = '#1a4a3a'; color = '#6ee7b7' }
            else if (i === selected) { bg = '#2a0f0f'; border = '#4a1515'; color = '#f87171' }
          } else if (selected === i) {
            bg = '#1a1033'; border = '#a78bfa'; color = '#a78bfa'
          }
          return (
            <button key={i} onClick={() => !confirmed && setSelected(i)} style={{
              padding: '12px 16px', borderRadius: 10, textAlign: 'left',
              background: bg, border: `1px solid ${border}`, color,
              cursor: confirmed ? 'default' : 'pointer', fontSize: 14, lineHeight: 1.5,
              transition: 'all .15s',
            }}>
              <span style={{ fontWeight: 700, marginRight: 8 }}>{['A', 'B', 'C', 'D'][i]}.</span>
              {choice}
              {confirmed && i === ex.answerIndex && <CheckCircle size={16} style={{ float: 'right', marginTop: 2 }} />}
              {confirmed && i === selected && i !== ex.answerIndex && <XCircle size={16} style={{ float: 'right', marginTop: 2 }} />}
            </button>
          )
        })}
      </div>

      {!confirmed ? (
        <button onClick={handleConfirm} disabled={selected === null} style={{
          width: '100%', padding: '13px', borderRadius: 10,
          background: selected !== null ? 'var(--purple)' : '#333',
          border: 'none', color: '#fff',
          fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700,
          cursor: selected !== null ? 'pointer' : 'not-allowed',
        }}>
          Valider ma réponse
        </button>
      ) : (
        <ExerciseCorrection exercise={ex} selected={selected!} onNext={handleNext} />
      )}

      {/* Score en cours */}
      <p style={{ textAlign: 'center', fontSize: 12, color: '#555', marginTop: '1rem' }}>
        Score actuel : {score}/{answered}
      </p>
    </div>
  )
}

// ─── Page principale Cartable ─────────────────────────────────────────────────
export function CartablePage() {
  const { user, profile } = useAuth()
  const hasAccess = profile?.role === 'superadmin' || ['pro', 'teacher'].includes(profile?.plan ?? '')

  const [view,        setView]        = useState<View>('list')
  const [cahiers,     setCahiers]     = useState<Cahier[]>([])
  const [activeCahier, setActiveCahier] = useState<Cahier | null>(null)
  const [uas,         setUAs]         = useState<UA[]>([])
  const [activeUA,    setActiveUA]    = useState<UA | null>(null)
  const [documents,   setDocuments]   = useState<CartableDocument[]>([])

  const [revMode,     setRevMode]     = useState<RevMode>('ua')
  const [revTargetUA, setRevTargetUA] = useState<UA | null>(null)
  const [revLang,     setRevLang]     = useState<Lang>('fr')

  const [loading,     setLoading]     = useState(true)
  const [uploading,   setUploading]   = useState(false)
  const [error,       setError]       = useState('')

  // Téléversement de photos (page de livre/notes → transcrites par l'IA)
  const [processingPhotos, setProcessingPhotos] = useState(false)
  const [photoProgress, setPhotoProgress] = useState({ current: 0, total: 0 })

  // Résumés & cours réécrit (Mon Cartable — génération à la demande)
  const [cahierSummaryLoading, setCahierSummaryLoading] = useState(false)
  const [expandedUA,   setExpandedUA]   = useState<string | null>(null)
  const [uaSummaryLoading, setUaSummaryLoading] = useState<Record<string, boolean>>({})
  const [readUA,      setReadUA]      = useState<UA | null>(null)
  const [readLoading, setReadLoading] = useState(false)
  const [readError,   setReadError]   = useState('')
  const [openCommentId, setOpenCommentId] = useState<string | null>(null)

  // Notes de l'élève (page de lecture)
  const [uaNotes,        setUaNotes]        = useState<UANote[]>([])
  const [selectionInfo,  setSelectionInfo]  = useState<{ paraIndex: number; text: string; x: number; y: number } | null>(null)
  const [showNoteForm,   setShowNoteForm]   = useState(false)
  const [noteDraft,      setNoteDraft]      = useState('')
  const [savingNote,     setSavingNote]     = useState(false)
  const [generalNoteDraft, setGeneralNoteDraft] = useState('')
  const readContentRef = useRef<HTMLDivElement>(null)

  // Lecture audio (Web Speech API)
  const [speaking, setSpeaking] = useState(false)
  const [paused,   setPaused]   = useState(false)

  // Arrêter la lecture si on quitte la vue UA ou en démontant la page
  useEffect(() => {
    if (view !== 'ua') { window.speechSynthesis.cancel(); setSpeaking(false); setPaused(false) }
  }, [view])
  useEffect(() => () => window.speechSynthesis.cancel(), [])

  const handleToggleReadAloud = () => {
    const synth = window.speechSynthesis
    if (speaking && !paused) { synth.pause(); setPaused(true); return }
    if (speaking && paused)  { synth.resume(); setPaused(false); return }

    const text = documents.map(d => d.text_content).join('\n\n').trim()
    if (!text) return
    synth.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = revLang === 'en' ? 'en-US' : 'fr-FR'
    utter.rate = 0.95
    utter.onend   = () => { setSpeaking(false); setPaused(false) }
    utter.onerror = () => { setSpeaking(false); setPaused(false) }
    synth.speak(utter)
    setSpeaking(true)
    setPaused(false)
  }

  const handleStopReadAloud = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
    setPaused(false)
  }

  // Modals création
  const [showNewCahier, setShowNewCahier] = useState(false)
  const [newName,       setNewName]       = useState('')
  const [newCode,       setNewCode]       = useState('')
  const [newUnitLabel,  setNewUnitLabel]  = useState<CartableUnitLabel>('UA')
  const [creatingCahier, setCreatingCahier] = useState(false)

  const [showNewUA,   setShowNewUA]   = useState(false)
  const [newUALabel,  setNewUALabel]  = useState('')
  const [creatingUA,  setCreatingUA]  = useState(false)
  const [uploadingFullCourse, setUploadingFullCourse] = useState(false)
  const fullCourseInputRef = useRef<HTMLInputElement>(null)

  // Charger cahiers
  useEffect(() => {
    if (!user) { setLoading(false); return }
    getCahiers(user.id).then(setCahiers).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  const openCahier = async (c: Cahier) => {
    setActiveCahier(c)
    setLoading(true)
    try {
      const uaList = await getUAs(c.id)
      // Charger docs pour chaque UA
      const uasWithDocs = await Promise.all(uaList.map(async u => {
        const docs = await getDocuments(u.id)
        return { ...u, documents: docs }
      }))
      setUAs(uasWithDocs)
      setActiveCahier({ ...c, uas: uasWithDocs })
    } catch { setError('Impossible de charger ce cahier.') }
    finally { setLoading(false) }
    setView('cahier')
  }

  const openUA = async (ua: UA) => {
    setActiveUA(ua)
    const docs = ua.documents ?? await getDocuments(ua.id)
    setDocuments(docs)
    setView('ua')
  }

  // Résumé du cahier entier — généré une seule fois à la première ouverture, puis mis en cache
  useEffect(() => {
    if (view !== 'cahier' || !activeCahier) return
    if (activeCahier.summary_points && activeCahier.summary_points.length > 0) return
    const totalDocs = uas.reduce((a, u) => a + (u.documents?.length ?? 0), 0)
    if (totalDocs === 0) return

    setCahierSummaryLoading(true)
    const content = uas
      .flatMap(u => (u.documents ?? []).map(d => `=== UA${u.number}${u.label ? ` — ${u.label}` : ''} ===\n${d.text_content}`))
      .join('\n\n')

    generateCahierSummary(activeCahier.id, activeCahier.name, content, revLang)
      .then(points => {
        setActiveCahier(c => c ? { ...c, summary_points: points } : c)
        setCahiers(prev => prev.map(c => c.id === activeCahier.id ? { ...c, summary_points: points } : c))
      })
      .catch(() => {})
      .finally(() => setCahierSummaryLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeCahier?.id])

  // Résumé d'une UA — généré à la première expansion de son accordéon
  const toggleUASummary = (ua: UA) => {
    const willOpen = expandedUA !== ua.id
    setExpandedUA(willOpen ? ua.id : null)
    if (!willOpen) return
    if (ua.summary_points && ua.summary_points.length > 0) return
    const docs = ua.documents ?? []
    if (docs.length === 0) return

    setUaSummaryLoading(prev => ({ ...prev, [ua.id]: true }))
    const content = docs.map(d => d.text_content).join('\n\n')
    generateUASummary(ua.id, ua.label || unitTitle(activeCahier, ua.number), content, revLang)
      .then(points => {
        const apply = (u: UA) => u.id === ua.id ? { ...u, summary_points: points } : u
        setUAs(prev => prev.map(apply))
        setActiveCahier(c => c ? { ...c, uas: (c.uas ?? []).map(apply) } : c)
      })
      .catch(() => {})
      .finally(() => setUaSummaryLoading(prev => ({ ...prev, [ua.id]: false })))
  }

  // Page de lecture — cours réécrit par l'IA avec annotations, généré à la première ouverture
  const openRead = async (ua: UA) => {
    setReadUA(ua)
    setReadError('')
    setOpenCommentId(null)
    setSelectionInfo(null)
    setShowNoteForm(false)
    setView('read')
    getUANotes(ua.id).then(setUaNotes).catch(() => setUaNotes([]))
    const docs = ua.documents ?? []
    if (docs.length === 0) return
    if (ua.rewritten_content) return

    setReadLoading(true)
    try {
      const content = docs.map(d => d.text_content).join('\n\n')
      const { rewritten, comments } = await generateUARewrite(ua.id, ua.label || unitTitle(activeCahier, ua.number), content, revLang)
      const updated = { ...ua, rewritten_content: rewritten, rewritten_comments: comments }
      setReadUA(updated)
      const apply = (u: UA) => u.id === ua.id ? updated : u
      setUAs(prev => prev.map(apply))
      setActiveCahier(c => c ? { ...c, uas: (c.uas ?? []).map(apply) } : c)
    } catch (err) {
      setReadError(err instanceof Error ? err.message : 'Impossible de générer le cours réécrit.')
    } finally {
      setReadLoading(false)
    }
  }

  // Sélection de texte sur la page de lecture → propose d'ajouter une note ancrée
  const handleTextSelection = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return
    const text = sel.toString().trim()
    if (!text || text.length > 300) { setSelectionInfo(null); return }
    const range = sel.getRangeAt(0)
    const container = readContentRef.current
    if (!container || !container.contains(range.commonAncestorContainer)) return

    let node: Node | null = range.commonAncestorContainer
    let paraEl: HTMLElement | null = null
    while (node) {
      if (node instanceof HTMLElement && node.dataset.para !== undefined) { paraEl = node; break }
      node = node.parentNode
    }
    if (!paraEl) return

    const rect = range.getBoundingClientRect()
    setSelectionInfo({ paraIndex: Number(paraEl.dataset.para), text, x: rect.left + rect.width / 2, y: rect.top })
    setShowNoteForm(false)
    setNoteDraft('')
  }

  const handleSaveInlineNote = async () => {
    if (!user || !readUA || !selectionInfo || !noteDraft.trim()) return
    setSavingNote(true)
    try {
      const note = await addUANote(readUA.id, user.id, 'inline', noteDraft.trim(), selectionInfo.text, selectionInfo.paraIndex)
      setUaNotes(prev => [...prev, note])
      setSelectionInfo(null)
      setShowNoteForm(false)
      setNoteDraft('')
      window.getSelection()?.removeAllRanges()
    } catch (err) {
      setReadError(err instanceof Error ? err.message : 'Impossible d\'enregistrer la note.')
    } finally {
      setSavingNote(false)
    }
  }

  const handleAddGeneralNote = async () => {
    if (!user || !readUA || !generalNoteDraft.trim()) return
    setSavingNote(true)
    try {
      const note = await addUANote(readUA.id, user.id, 'general', generalNoteDraft.trim())
      setUaNotes(prev => [...prev, note])
      setGeneralNoteDraft('')
    } catch (err) {
      setReadError(err instanceof Error ? err.message : 'Impossible d\'enregistrer la note.')
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteStudentNote = async (noteId: string) => {
    setUaNotes(prev => prev.filter(n => n.id !== noteId))
    try { await deleteUANote(noteId) } catch { /* déjà retiré de l'affichage */ }
  }

  // Créer cahier
  const handleCreateCahier = async () => {
    if (!newName.trim() || !user) return
    setCreatingCahier(true)
    try {
      const c = await createCahier(user.id, newName.trim(), newCode.trim(), newUnitLabel)
      setCahiers(prev => [{ ...c, uas: [] }, ...prev])
      setShowNewCahier(false); setNewName(''); setNewCode(''); setNewUnitLabel('UA')
    } catch { setError('Impossible de créer le cahier.') }
    finally { setCreatingCahier(false) }
  }

  // Créer UA
  const handleCreateUA = async () => {
    if (!activeCahier) return
    setCreatingUA(true)
    try {
      const nextNum = (uas.length > 0 ? Math.max(...uas.map(u => u.number)) : 0) + 1
      const ua = await createUA(activeCahier.id, nextNum, newUALabel.trim())
      const uaWithDocs = { ...ua, documents: [] }
      setUAs(prev => [...prev, uaWithDocs])
      setActiveCahier(c => c ? { ...c, uas: [...(c.uas ?? []), uaWithDocs] } : c)
      setShowNewUA(false); setNewUALabel('')
    } catch { setError('Impossible de créer l\'UA.') }
    finally { setCreatingUA(false) }
  }

  // Téléverser le cours complet en un seul document (crée/réutilise une UA dédiée)
  const FULL_COURSE_LABEL = 'Cours complet'
  const handleUploadFullCourse = async (file: File) => {
    if (!activeCahier || !user) return
    setUploadingFullCourse(true); setError('')
    try {
      const text = await extractText(file)
      let targetUA = uas.find(u => u.label === FULL_COURSE_LABEL)
      if (!targetUA) {
        const ua = await createUA(activeCahier.id, 0, FULL_COURSE_LABEL)
        targetUA = { ...ua, documents: [] }
        setUAs(prev => [...prev, targetUA!])
        setActiveCahier(c => c ? { ...c, uas: [...(c.uas ?? []), targetUA!] } : c)
      }
      const doc = await uploadDocument(targetUA.id, user.id, file.name, text, file.size)
      const updatedUA = { ...targetUA, documents: [...(targetUA.documents ?? []), doc] }
      setUAs(prev => prev.map(u => u.id === updatedUA.id ? updatedUA : u))
      setActiveCahier(c => c ? { ...c, uas: (c.uas ?? []).map(u => u.id === updatedUA.id ? updatedUA : u) } : c)
      await openUA(updatedUA)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de lire ce fichier.')
    } finally {
      setUploadingFullCourse(false)
    }
  }

  // Supprimer cahier
  const handleDeleteCahier = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Supprimer ce cahier et tout son contenu ?')) return
    await deleteCahier(id)
    setCahiers(prev => prev.filter(c => c.id !== id))
  }

  // Supprimer UA
  const handleDeleteUA = async (ua: UA, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Supprimer ${unitTitle(activeCahier, ua.number)} et tous ses documents ?`)) return
    await deleteUA(ua.id)
    setUAs(prev => prev.filter(u => u.id !== ua.id))
  }

  // Téléverser document dans l'UA active
  const handleUpload = useCallback(async (file: File) => {
    if (!activeUA || !user) return
    setUploading(true); setError('')
    try {
      const text = await extractText(file)
      const doc  = await uploadDocument(activeUA.id, user.id, file.name, text, file.size)
      setDocuments(prev => [...prev, doc])
      // Mettre à jour l'UA dans la liste
      setUAs(prev => prev.map(u => u.id === activeUA.id ? { ...u, documents: [...(u.documents ?? []), doc] } : u))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de lire ce fichier.')
    } finally { setUploading(false) }
  }, [activeUA, user])

  // Téléverser une ou plusieurs photos (chaque photo devient un document, transcrit par l'IA)
  const handleUploadPhotos = useCallback(async (files: File[]) => {
    if (!activeUA || !user || files.length === 0) return
    setProcessingPhotos(true); setError('')
    setPhotoProgress({ current: 0, total: files.length })
    try {
      for (let i = 0; i < files.length; i++) {
        setPhotoProgress({ current: i + 1, total: files.length })
        const file = files[i]
        const text = await extractTextFromImage(file)
        const doc  = await uploadDocument(activeUA.id, user.id, file.name || `Photo ${i + 1}`, text, file.size)
        setDocuments(prev => [...prev, doc])
        setUAs(prev => prev.map(u => u.id === activeUA.id ? { ...u, documents: [...(u.documents ?? []), doc] } : u))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de traiter une des photos.')
    } finally {
      setProcessingPhotos(false)
      setPhotoProgress({ current: 0, total: 0 })
    }
  }, [activeUA, user])

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Supprimer ce document ?')) return
    await deleteDocument(docId)
    setDocuments(prev => prev.filter(d => d.id !== docId))
  }

  // Lancer révision
  const startRevision = (ua: UA | null, mode: RevMode) => {
    if (!activeCahier) return
    setRevTargetUA(ua)
    setRevMode(mode)
    setView('revision')
  }

  if (!hasAccess) {
    return (
      <div style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎒</div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.5rem' }}>Mon Cartable</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Disponible avec les plans <strong style={{ color: 'var(--white)' }}>Pro</strong> et <strong style={{ color: 'var(--white)' }}>Enseignant</strong>.
        </p>
      </div>
    )
  }

  // ── Vue révision ─────────────────────────────────────────────────────────────
  if (view === 'revision' && activeCahier) {
    return (
      <RevisionView
        cahier={activeCahier}
        targetUA={revTargetUA}
        mode={revMode}
        lang={revLang}
        onBack={() => setView('cahier')}
      />
    )
  }

  // ── Vue lecture (cours réécrit + annotations + tuteur) ───────────────────────
  if (view === 'read' && readUA && activeCahier) {
    const docs = readUA.documents ?? []
    return (
      <>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem 6rem' }} className="fade-in">
          <button onClick={() => setView('cahier')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: '1.5rem' }}>
            <ChevronLeft size={15} /> {activeCahier.name}
          </button>

          <div style={{ marginBottom: '.3rem', fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Cours réécrit par l'IA
          </div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: '1.75rem' }}>
            {readUA.label ? readUA.label : unitTitle(activeCahier, readUA.number)}
          </h1>

          {docs.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Aucun document dans {thisUnitPhrase(activeCahier)} pour l'instant.</p>
          ) : readLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1rem' }}>
              <Loader size={32} className="spin" style={{ color: 'var(--purple)' }} />
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>L'IA réécrit le cours et prépare les commentaires…</p>
            </div>
          ) : readError ? (
            <div style={{ padding: '1rem', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>{readError}</div>
          ) : (
            <>
              <p style={{ color: '#555', fontSize: 11.5, marginBottom: '1rem' }}>
                💡 Sélectionne un passage pour y ajouter ta propre note.
              </p>
              <div ref={readContentRef} onMouseUp={handleTextSelection} onTouchEnd={handleTextSelection}>
                {renderRewrittenContent(readUA.rewritten_content ?? '', readUA.rewritten_comments ?? {}, uaNotes, openCommentId, setOpenCommentId, handleDeleteStudentNote)}
              </div>
            </>
          )}

          {selectionInfo && (
            <div style={{
              position: 'fixed', zIndex: 210,
              left: Math.min(Math.max(selectionInfo.x, 160), window.innerWidth - 160),
              top: Math.max(selectionInfo.y - 8, 70),
              transform: 'translate(-50%, -100%)',
            }}>
              {!showNoteForm ? (
                <button
                  onClick={() => setShowNoteForm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 20, border: 'none',
                    background: '#f5a623', color: '#2a1f00', fontSize: 12.5, fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,.4)', whiteSpace: 'nowrap',
                  }}
                >
                  <PenLine size={13} /> Ajouter une note
                </button>
              ) : (
                <div style={{
                  width: 260, background: 'var(--bg2)', border: '1px solid #6b4a12', borderRadius: 12,
                  padding: '.7rem', boxShadow: '0 8px 30px rgba(0,0,0,.5)',
                }}>
                  <p style={{ fontSize: 11.5, color: '#f5a623', fontStyle: 'italic', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    « {selectionInfo.text} »
                  </p>
                  <textarea
                    autoFocus
                    value={noteDraft}
                    onChange={e => setNoteDraft(e.target.value)}
                    placeholder="Ta note sur ce passage…"
                    rows={2}
                    style={{
                      width: '100%', boxSizing: 'border-box', resize: 'none', background: 'var(--bg3)',
                      border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px',
                      color: 'var(--text)', fontSize: 12.5, fontFamily: 'inherit', marginBottom: 6,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={handleSaveInlineNote} disabled={!noteDraft.trim() || savingNote}
                      style={{
                        flex: 1, padding: '6px', borderRadius: 6, border: 'none',
                        background: noteDraft.trim() ? '#f5a623' : '#333', color: noteDraft.trim() ? '#2a1f00' : '#777',
                        fontSize: 12, fontWeight: 700, cursor: noteDraft.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {savingNote ? <Loader size={12} className="spin" /> : 'Enregistrer'}
                    </button>
                    <button
                      onClick={() => { setSelectionInfo(null); setShowNoteForm(false); setNoteDraft('') }}
                      style={{ padding: '6px 10px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!readLoading && docs.length > 0 && (
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: '.75rem' }}>Prêt à tester tes connaissances sur {thisUnitPhrase(activeCahier)} ?</p>
              <button onClick={() => startRevision(readUA, 'ua')} style={{
                padding: '11px 20px', background: 'var(--purple)', border: 'none', borderRadius: 10,
                color: '#fff', fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                📖 Révision {unitTitle(activeCahier, readUA.number)}
              </button>
            </div>
          )}
        </div>

        {!readLoading && docs.length > 0 && (
          <>
            <CartableTutor
              title={readUA.label || unitTitle(activeCahier, readUA.number)}
              content={stripAnnotationMarkers(readUA.rewritten_content ?? '')}
            />
            <NotesPanel
              notes={uaNotes}
              onAddGeneral={handleAddGeneralNote}
              generalDraft={generalNoteDraft}
              setGeneralDraft={setGeneralNoteDraft}
              saving={savingNote}
              onDelete={handleDeleteStudentNote}
            />
          </>
        )}
      </>
    )
  }

  // ── Vue UA ───────────────────────────────────────────────────────────────────
  if (view === 'ua' && activeUA && activeCahier) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem' }} className="fade-in">
        <button onClick={() => setView('cahier')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: '1.5rem' }}>
          <ChevronLeft size={15} /> {activeCahier.name}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.2rem' }}>
              {unitTitle(activeCahier, activeUA.number)}{activeUA.label ? ` — ${activeUA.label}` : ''}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>{documents.length} document{documents.length > 1 ? 's' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleToggleReadAloud}
              disabled={documents.length === 0}
              title={documents.length === 0 ? 'Ajoute un document pour activer la lecture audio' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', background: documents.length > 0 ? '#2d1b69' : 'var(--bg3)',
                border: `1px solid ${documents.length > 0 ? '#4a3080' : 'var(--border)'}`, borderRadius: 10,
                color: documents.length > 0 ? '#a78bfa' : '#555',
                fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700,
                cursor: documents.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              {speaking && !paused
                ? <><Pause size={15} /> Pause</>
                : speaking && paused
                  ? <><Play size={15} /> Reprendre</>
                  : <><Volume2 size={15} /> Lire à voix haute</>}
            </button>
            {speaking && (
              <button onClick={handleStopReadAloud} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 14px', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 10, color: 'var(--muted)',
                fontSize: 13, cursor: 'pointer',
              }}>
                <StopCircle size={15} /> Arrêter
              </button>
            )}
            <button
              onClick={() => startRevision(activeUA, 'ua')}
              disabled={documents.length === 0}
              style={{
                padding: '10px 18px', background: documents.length > 0 ? 'var(--purple)' : '#333',
                border: 'none', borderRadius: 10, color: '#fff',
                fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700,
                cursor: documents.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              📖 Révision {unitTitle(activeCahier, activeUA.number)}
            </button>
          </div>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: '1rem' }}>{error}</div>}

        {/* Zone d'upload */}
        <div
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
          onDragOver={e => e.preventDefault()}
          onClick={() => document.getElementById('ua-file-input')?.click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 14,
            padding: '2rem', textAlign: 'center', cursor: 'pointer',
            marginBottom: '1.5rem', transition: 'border-color .2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <input id="ua-file-input" type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
          {uploading
            ? <><Loader size={22} className="spin" style={{ color: 'var(--purple)', marginBottom: '.5rem' }} /><p style={{ color: 'var(--muted)', fontSize: 14 }}>Lecture en cours…</p></>
            : <><Upload size={22} style={{ color: 'var(--muted)', marginBottom: '.5rem' }} /><p style={{ color: 'var(--text)', marginBottom: '.2rem', fontSize: 14 }}>Glissez vos notes ici ou cliquez</p><p style={{ color: '#555', fontSize: 12 }}>PDF, TXT, MD</p></>
          }
        </div>

        {/* Zone photo — pour un livre physique sans version PDF */}
        <div
          onClick={() => !processingPhotos && document.getElementById('ua-photo-input')?.click()}
          style={{
            border: '1px dashed #4a3080', borderRadius: 14,
            padding: '1.25rem', textAlign: 'center', cursor: processingPhotos ? 'default' : 'pointer',
            marginBottom: '1.5rem', transition: 'border-color .2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
          onMouseEnter={e => { if (!processingPhotos) e.currentTarget.style.borderColor = '#a78bfa' }}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#4a3080')}
        >
          <input
            id="ua-photo-input" type="file" accept="image/*" capture="environment" multiple
            style={{ display: 'none' }}
            onChange={e => {
              const files = Array.from(e.target.files ?? [])
              if (files.length) handleUploadPhotos(files)
              e.target.value = ''
            }}
          />
          {processingPhotos ? (
            <>
              <Loader size={18} className="spin" style={{ color: '#a78bfa' }} />
              <p style={{ color: '#a78bfa', fontSize: 13 }}>
                Transcription de la photo {photoProgress.current} / {photoProgress.total}…
              </p>
            </>
          ) : (
            <p style={{ color: '#a78bfa', fontSize: 13, fontWeight: 600 }}>
              📷 Prendre une photo (ou plusieurs) — pour un livre sans version PDF
            </p>
          )}
        </div>

        {/* Documents */}
        {documents.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {documents.map(doc => (
              <div key={doc.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '.85rem 1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={18} style={{ color: '#a78bfa', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('fr-CA')}</div>
                </div>
                <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Vue Cahier ────────────────────────────────────────────────────────────────
  if (view === 'cahier' && activeCahier) {
    const totalDocs = uas.reduce((a, u) => a + (u.documents?.length ?? 0), 0)
    const canRevise = totalDocs > 0
    const isFullCourseMode = uas.some(u => u.label === FULL_COURSE_LABEL)

    return (
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '2rem 1.5rem' }} className="fade-in">
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: '1.5rem' }}>
          <ChevronLeft size={15} /> Mon Cartable
        </button>

        {/* En-tête cahier */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1033, #1a1033)',
          border: '1px solid #4a3080', borderRadius: 20, padding: '1.75rem 2rem', marginBottom: '2rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.3rem' }}>
                📒 Cahier de cours
              </div>
              <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.2rem' }}>
                {activeCahier.name}
              </h1>
              {activeCahier.course_code && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{activeCahier.course_code}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
              {/* Langue */}
              <select value={revLang} onChange={e => setRevLang(e.target.value as Lang)} style={{
                padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)', fontSize: 12,
              }}>
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
              </select>
              <button
                onClick={() => startRevision(null, 'final')}
                disabled={!canRevise}
                style={{
                  padding: '9px 16px', background: canRevise ? 'linear-gradient(135deg, #e03c3c, #dc2626)' : '#333',
                  border: 'none', borderRadius: 10, color: '#fff',
                  fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700,
                  cursor: canRevise ? 'pointer' : 'not-allowed',
                  boxShadow: canRevise ? '0 0 18px rgba(224,60,60,.3)' : 'none',
                }}
              >
                🏁 Révision examen final
              </button>
            </div>
          </div>
          <div style={{ marginTop: '1rem', fontSize: 13, color: 'var(--muted)' }}>
            {uas.length} {unitNoun(activeCahier, uas.length)} · {totalDocs} document{totalDocs > 1 ? 's' : ''} téléversé{totalDocs > 1 ? 's' : ''}
          </div>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: '1rem' }}>{error}</div>}

        <div className="cartable-split">
          {/* ── Colonne gauche 70% : liste des UAs ─────────────────────────── */}
          <div className="cartable-split-left">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1rem' }}>
              {uas.map(ua => (
                <div key={ua.id} onClick={() => openRead(ua)} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
                  padding: '1rem 1.25rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                  transition: 'border-color .2s, transform .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: '#2d1b69', border: '1px solid #4a3080',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-head)', fontWeight: 800, color: '#a78bfa', fontSize: 14,
                    }}>
                      {ua.number}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '.95rem' }}>
                        {unitTitle(activeCahier, ua.number)}{ua.label ? ` — ${ua.label}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {(ua.documents?.length ?? 0)} document{(ua.documents?.length ?? 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <button
                      onClick={e => { e.stopPropagation(); openUA(ua) }}
                      title="Gérer les documents"
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center' }}
                    >
                      <FileText size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); startRevision(ua, 'ua') }}
                      disabled={(ua.documents?.length ?? 0) === 0}
                      style={{
                        padding: '5px 12px', borderRadius: 8,
                        background: (ua.documents?.length ?? 0) > 0 ? '#2d1b69' : 'var(--bg3)',
                        border: '1px solid #4a3080', color: '#a78bfa',
                        fontSize: 12, fontWeight: 600, cursor: (ua.documents?.length ?? 0) > 0 ? 'pointer' : 'not-allowed',
                      }}
                    >
                      📖 Réviser
                    </button>
                    <button onClick={e => handleDeleteUA(ua, e)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton(s) d'ajout — dépend du mode déjà choisi pour ce cahier */}
            {isFullCourseMode ? (
              // Cahier en mode "cours complet" : plus de choix, juste ajouter d'autres documents au même cours
              <div style={{ display: 'flex', gap: '.6rem' }}>
                <input
                  ref={fullCourseInputRef} type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFullCourse(f); e.target.value = '' }}
                />
                <button
                  onClick={() => fullCourseInputRef.current?.click()}
                  disabled={uploadingFullCourse}
                  title="Ajoute un document supplémentaire au cours complet déjà téléversé."
                  style={{
                    flex: 1, padding: '11px', borderRadius: 12,
                    background: 'transparent', border: '1px dashed #4a3080',
                    color: '#a78bfa', cursor: uploadingFullCourse ? 'not-allowed' : 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {uploadingFullCourse
                    ? <><Loader size={15} className="spin" /> Lecture en cours…</>
                    : <><Plus size={15} /> Ajouter un document au cours</>}
                </button>
              </div>
            ) : showNewUA ? (
              <div style={{ background: 'var(--bg2)', border: '1px solid #4a3080', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                <input
                  autoFocus value={newUALabel} onChange={e => setNewUALabel(e.target.value)}
                  placeholder={`Titre optionnel pour ${unitTitle(activeCahier, (uas.length > 0 ? Math.max(...uas.map(u => u.number)) : 0) + 1)} (ex: Algèbre linéaire)`}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, marginBottom: '.6rem' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateUA(); if (e.key === 'Escape') setShowNewUA(false) }}
                />
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button onClick={handleCreateUA} disabled={creatingUA} style={{ flex: 1, padding: '8px', background: 'var(--purple)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {creatingUA ? <Loader size={14} className="spin" /> : `+ Créer ${unitTitle(activeCahier, (uas.length > 0 ? Math.max(...uas.map(u => u.number)) : 0) + 1)}`}
                  </button>
                  <button onClick={() => setShowNewUA(false)} style={{ padding: '8px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                </div>
              </div>
            ) : uas.length > 0 ? (
              // Déjà en mode "UA par UA" : uniquement l'option d'ajouter une autre UA
              <button onClick={() => setShowNewUA(true)} style={{
                width: '100%', padding: '11px', borderRadius: 12,
                background: 'transparent', border: '1px dashed var(--border)',
                color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Plus size={15} /> {addUnitButtonLabel(activeCahier)}
              </button>
            ) : (
              // Cahier vide : choix initial entre les deux modes
              <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                <button onClick={() => setShowNewUA(true)} style={{
                  flex: 1, minWidth: 180, padding: '11px', borderRadius: 12,
                  background: 'transparent', border: '1px dashed var(--border)',
                  color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Plus size={15} /> {addUnitButtonLabel(activeCahier)}
                </button>
                <input
                  ref={fullCourseInputRef} type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFullCourse(f); e.target.value = '' }}
                />
                <button
                  onClick={() => fullCourseInputRef.current?.click()}
                  disabled={uploadingFullCourse}
                  title="Si tu as déjà le cours complet dans un seul document (ex: un livre PDF), téléverse-le directement ici."
                  style={{
                    flex: 1, minWidth: 180, padding: '11px', borderRadius: 12,
                    background: 'transparent', border: '1px dashed #4a3080',
                    color: '#a78bfa', cursor: uploadingFullCourse ? 'not-allowed' : 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {uploadingFullCourse
                    ? <><Loader size={15} className="spin" /> Lecture en cours…</>
                    : <><Library size={15} /> Mettre le cours complet</>}
                </button>
              </div>
            )}
          </div>

          {/* ── Colonne droite 30% : résumés ────────────────────────────────── */}
          <div className="cartable-split-right">
            {/* Résumé du cours entier */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: 13, marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={14} style={{ color: '#a78bfa' }} /> Résumé du cours
              </div>
              {totalDocs === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6 }}>Ajoute des documents pour générer un résumé.</p>
              ) : cahierSummaryLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 12.5 }}>
                  <Loader size={14} className="spin" /> Génération du résumé…
                </div>
              ) : activeCahier.summary_points && activeCahier.summary_points.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeCahier.summary_points.map((pt, i) => (
                    <li key={i} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55 }}>{pt}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>Résumé indisponible.</p>
              )}
            </div>

            {/* Résumé par UA (accordéon) */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: 13, marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <GraduationCap size={14} style={{ color: '#a78bfa' }} /> Résumé par {activeCahier.unit_label === 'Chapitre' ? 'chapitre' : 'UA'}
              </div>
              {uas.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6 }}>{noUnitYetPhrase(activeCahier)}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {uas.map(ua => {
                    const isOpen = expandedUA === ua.id
                    const hasDocs = (ua.documents?.length ?? 0) > 0
                    return (
                      <div key={ua.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                        <button
                          onClick={() => toggleUASummary(ua)}
                          disabled={!hasDocs}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'none', border: 'none', padding: 0,
                            color: hasDocs ? 'var(--text)' : '#555', fontSize: 12.5, fontWeight: 600,
                            cursor: hasDocs ? 'pointer' : 'not-allowed', textAlign: 'left',
                          }}
                        >
                          <span>{unitTitle(activeCahier, ua.number)}{ua.label ? ` — ${ua.label}` : ''}</span>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {isOpen && (
                          <div style={{ marginTop: 8 }}>
                            {uaSummaryLoading[ua.id] ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 12 }}>
                                <Loader size={13} className="spin" /> Génération…
                              </div>
                            ) : ua.summary_points && ua.summary_points.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {ua.summary_points.map((pt, i) => (
                                  <li key={i} style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{pt}</li>
                                ))}
                              </ul>
                            ) : (
                              <p style={{ fontSize: 12, color: 'var(--muted)' }}>Aucun résumé disponible.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Vue liste (Cartable) ──────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.2rem' }}>
            🎒 Mon Cartable
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>{cahiers.length} cahier{cahiers.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowNewCahier(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 18px', background: 'var(--purple)', border: 'none',
          borderRadius: 10, color: '#fff', fontFamily: 'var(--font-head)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={15} /> Nouveau cahier
        </button>
      </div>

      {/* Modal nouveau cahier */}
      {showNewCahier && (
        <div style={{ background: 'var(--bg2)', border: '1px solid #4a3080', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', marginBottom: '1rem', fontSize: '1rem' }}>
            📒 Nouveau cahier
          </h3>
          <input
            autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nom du cours (ex: Mathématiques, Psychologie…)"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: '.6rem' }}
          />
          <input
            value={newCode} onChange={e => setNewCode(e.target.value)}
            placeholder="Code du cours (optionnel : MAT101, PSY201…)"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: '.75rem' }}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateCahier() }}
          />
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: 12.5, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
              Comment veux-tu nommer les sections de ce cahier ?
            </label>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              {(['UA', 'Chapitre'] as const).map(opt => (
                <button key={opt} onClick={() => setNewUnitLabel(opt)} style={{
                  flex: 1, padding: '9px', borderRadius: 8,
                  background: newUnitLabel === opt ? '#2d1b69' : 'var(--bg3)',
                  border: `1px solid ${newUnitLabel === opt ? '#a78bfa' : 'var(--border)'}`,
                  color: newUnitLabel === opt ? '#a78bfa' : 'var(--muted)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {opt === 'UA' ? 'UA (unités scolaires)' : 'Chapitre (livre, guide…)'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.6rem' }}>
            <button onClick={handleCreateCahier} disabled={!newName.trim() || creatingCahier} style={{
              flex: 1, padding: '10px', background: newName.trim() ? 'var(--purple)' : '#333',
              border: 'none', borderRadius: 8, color: '#fff',
              fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, cursor: newName.trim() ? 'pointer' : 'not-allowed',
            }}>
              {creatingCahier ? <Loader size={14} className="spin" /> : 'Créer le cahier'}
            </button>
            <button onClick={() => { setShowNewCahier(false); setNewName(''); setNewCode(''); setNewUnitLabel('UA') }} style={{
              padding: '10px 16px', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
            }}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <Loader size={28} className="spin" style={{ color: 'var(--purple)' }} />
        </div>
      ) : cahiers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--bg2)', border: '2px dashed var(--border)', borderRadius: 20 }}>
          <GraduationCap size={48} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
          <h2 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '.5rem' }}>Cartable vide</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Crée ton premier cahier pour organiser tes cours par matière.
          </p>
          <button onClick={() => setShowNewCahier(true)} style={{
            padding: '11px 24px', background: 'var(--purple)', border: 'none',
            borderRadius: 10, color: '#fff', fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            + Créer mon premier cahier
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {cahiers.map(c => {
            const uaCount  = c.uas?.length ?? 0
            const docCount = c.uas?.reduce((a, u) => a + (u.documents?.length ?? 0), 0) ?? 0
            return (
              <div key={c.id} onClick={() => openCahier(c)} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
                padding: '1.25rem 1.5rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                transition: 'border-color .2s, transform .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, #2d1b69, #1a1033)',
                    border: '1px solid #4a3080',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                  }}>📒</div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '1rem' }}>
                      Cahier de {c.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {c.course_code && <span style={{ marginRight: 8, color: '#a78bfa' }}>{c.course_code}</span>}
                      <BookOpen size={11} style={{ display: 'inline', marginRight: 3 }} />
                      {uaCount} {unitNoun(c, uaCount)} · {docCount} doc{docCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>Ouvrir →</span>
                  <button onClick={e => handleDeleteCahier(c.id, e)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={15} />
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
