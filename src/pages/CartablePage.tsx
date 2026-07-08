import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Upload, ChevronLeft, BookOpen, FileText, Loader,
         GraduationCap, AlertTriangle, CheckCircle, XCircle, RefreshCw, RotateCcw } from 'lucide-react'
import {
  getCahiers, createCahier, deleteCahier,
  getUAs, createUA, deleteUA,
  getDocuments, uploadDocument, deleteDocument,
  generateRevision,
  type Cahier, type UA, type CartableDocument, type RevisionExercise, type RevisionResult,
} from '../utils/supabase'
import { extractText } from '../utils/pdfExtract'
import { useAuth } from '../hooks/useAuth'

type View = 'list' | 'cahier' | 'ua' | 'revision'
type RevMode = 'ua' | 'final'
type Lang = 'fr' | 'en'

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

      const res = await generateRevision(mode, cahier.name, uaData, 10, lang, existing)
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
        {mode === 'final' ? 'Génération de l\'examen final…' : `Génération révision UA${targetUA?.number}…`}
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
          background: 'linear-gradient(135deg, #12101e, #1a1033)',
          border: '1px solid #3d2b6b', borderRadius: 20, padding: '2.5rem 2rem', textAlign: 'center',
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
          {mode === 'final' ? '🏁 Examen final' : `📖 Révision UA${targetUA?.number}`} — {cahier.name}
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

  // Modals création
  const [showNewCahier, setShowNewCahier] = useState(false)
  const [newName,       setNewName]       = useState('')
  const [newCode,       setNewCode]       = useState('')
  const [creatingCahier, setCreatingCahier] = useState(false)

  const [showNewUA,   setShowNewUA]   = useState(false)
  const [newUALabel,  setNewUALabel]  = useState('')
  const [creatingUA,  setCreatingUA]  = useState(false)

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

  // Créer cahier
  const handleCreateCahier = async () => {
    if (!newName.trim() || !user) return
    setCreatingCahier(true)
    try {
      const c = await createCahier(user.id, newName.trim(), newCode.trim())
      setCahiers(prev => [{ ...c, uas: [] }, ...prev])
      setShowNewCahier(false); setNewName(''); setNewCode('')
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
    if (!confirm(`Supprimer UA${ua.number} et tous ses documents ?`)) return
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
          Disponible avec les plans <strong style={{ color: 'var(--white)' }}>Pro</strong>, <strong style={{ color: 'var(--white)' }}>Autodidacte</strong> et <strong style={{ color: 'var(--white)' }}>Enseignant</strong>.
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
              UA{activeUA.number}{activeUA.label ? ` — ${activeUA.label}` : ''}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>{documents.length} document{documents.length > 1 ? 's' : ''}</p>
          </div>
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
            📖 Révision UA{activeUA.number}
          </button>
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

    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }} className="fade-in">
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: '1.5rem' }}>
          <ChevronLeft size={15} /> Mon Cartable
        </button>

        {/* En-tête cahier */}
        <div style={{
          background: 'linear-gradient(135deg, #12101e, #1a1033)',
          border: '1px solid #3d2b6b', borderRadius: 20, padding: '1.75rem 2rem', marginBottom: '2rem',
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
            {uas.length} UA{uas.length > 1 ? 's' : ''} · {totalDocs} document{totalDocs > 1 ? 's' : ''} téléversé{totalDocs > 1 ? 's' : ''}
          </div>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: '1rem' }}>{error}</div>}

        {/* Liste des UAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1rem' }}>
          {uas.map(ua => (
            <div key={ua.id} onClick={() => openUA(ua)} style={{
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
                  background: '#2d1b69', border: '1px solid #3d2b6b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-head)', fontWeight: 800, color: '#a78bfa', fontSize: 14,
                }}>
                  {ua.number}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '.95rem' }}>
                    UA{ua.number}{ua.label ? ` — ${ua.label}` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {(ua.documents?.length ?? 0)} document{(ua.documents?.length ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <button
                  onClick={e => { e.stopPropagation(); startRevision(ua, 'ua') }}
                  disabled={(ua.documents?.length ?? 0) === 0}
                  style={{
                    padding: '5px 12px', borderRadius: 8,
                    background: (ua.documents?.length ?? 0) > 0 ? '#2d1b69' : 'var(--bg3)',
                    border: '1px solid #3d2b6b', color: '#a78bfa',
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

        {/* Bouton + UA */}
        {showNewUA ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid #3d2b6b', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
            <input
              autoFocus value={newUALabel} onChange={e => setNewUALabel(e.target.value)}
              placeholder={`Titre optionnel pour UA${(uas.length > 0 ? Math.max(...uas.map(u => u.number)) : 0) + 1} (ex: Algèbre linéaire)`}
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, marginBottom: '.6rem' }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateUA(); if (e.key === 'Escape') setShowNewUA(false) }}
            />
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button onClick={handleCreateUA} disabled={creatingUA} style={{ flex: 1, padding: '8px', background: 'var(--purple)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {creatingUA ? <Loader size={14} className="spin" /> : `+ Créer UA${(uas.length > 0 ? Math.max(...uas.map(u => u.number)) : 0) + 1}`}
              </button>
              <button onClick={() => setShowNewUA(false)} style={{ padding: '8px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewUA(true)} style={{
            width: '100%', padding: '11px', borderRadius: 12,
            background: 'transparent', border: '1px dashed var(--border)',
            color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Plus size={15} /> Ajouter une UA
          </button>
        )}
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
        <div style={{ background: 'var(--bg2)', border: '1px solid #3d2b6b', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
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
          <div style={{ display: 'flex', gap: '.6rem' }}>
            <button onClick={handleCreateCahier} disabled={!newName.trim() || creatingCahier} style={{
              flex: 1, padding: '10px', background: newName.trim() ? 'var(--purple)' : '#333',
              border: 'none', borderRadius: 8, color: '#fff',
              fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, cursor: newName.trim() ? 'pointer' : 'not-allowed',
            }}>
              {creatingCahier ? <Loader size={14} className="spin" /> : 'Créer le cahier'}
            </button>
            <button onClick={() => { setShowNewCahier(false); setNewName(''); setNewCode('') }} style={{
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
                    border: '1px solid #3d2b6b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                  }}>📒</div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '1rem' }}>
                      Cahier de {c.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {c.course_code && <span style={{ marginRight: 8, color: '#a78bfa' }}>{c.course_code}</span>}
                      <BookOpen size={11} style={{ display: 'inline', marginRight: 3 }} />
                      {uaCount} UA{uaCount !== 1 ? 's' : ''} · {docCount} doc{docCount !== 1 ? 's' : ''}
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
