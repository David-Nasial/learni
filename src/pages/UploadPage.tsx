// ─── Page Upload — Import PDF + options ───────────────────────────────────────
import { useState, useRef } from 'react'
import { UploadCloud, FileText, AlertCircle, Lock, X, Plus } from 'lucide-react'
import type { GenerateOptions, QuizLength, QuestionType, AnswerMode, QuizLanguage, Plan, UserRole } from '../types'
import { extractText } from '../utils/pdfExtract'

const MAX_FILES = 5

interface Props {
  onGenerate: (opts: GenerateOptions) => void
  plan: Plan
  role: UserRole
  onUpgrade: () => void
}

export function UploadPage({ onGenerate, plan, role, onUpgrade }: Props) {
  const hasAdvancedAccess = role === 'superadmin' || plan !== 'free'

  const [files, setFiles] = useState<File[]>([])
  const [extractError, setExtractError] = useState('')
  const [numQ, setNumQ] = useState<QuizLength>(10)
  const [qType, setQType] = useState<QuestionType>('all')
  const [answerMode, setAnswerMode] = useState<AnswerMode>('mcq')
  const [lang, setLang] = useState<QuizLanguage>('fr')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [teacherSpecs, setTeacherSpecs] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0) return
    setExtractError('')

    // Le multi-document est réservé aux plans payants
    if (!hasAdvancedAccess && (files.length > 0 || incoming.length > 1)) {
      onUpgrade()
      if (files.length === 0) setFiles([incoming[0]])
      return
    }

    const combined = [...files, ...incoming]
    if (combined.length > MAX_FILES) {
      setExtractError(`Maximum ${MAX_FILES} documents — les ${MAX_FILES} premiers ont été gardés.`)
    }
    setFiles(combined.slice(0, MAX_FILES))
  }

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  const handleGenerate = async () => {
    if (files.length === 0) return
    setLoading(true)
    setExtractError('')
    try {
      const parts: string[] = []
      for (let i = 0; i < files.length; i++) {
        setLoadingStep(files.length > 1 ? `Extraction du texte (${i + 1}/${files.length})…` : 'Extraction du texte…')
        const text = await extractText(files[i])
        if (text.trim()) {
          parts.push(files.length > 1 ? `--- Document ${i + 1} : ${files[i].name} ---\n${text}` : text)
        }
      }
      const combinedText = parts.join('\n\n')
      if (!combinedText.trim()) throw new Error('Le(s) fichier(s) semblent vides ou illisibles.')

      const title = files.length === 1
        ? files[0].name.replace(/\.[^.]+$/, '')
        : `${files.length} documents combinés`

      onGenerate({
        pdfText: combinedText,
        numQuestions: numQ,
        questionType: qType,
        answerMode,
        language: lang,
        documentTitle: title,
        teacherSpecs: hasAdvancedAccess ? teacherSpecs.trim() : undefined,
      })
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  // Option button helper
  const optBtn = (
    active: boolean, onClick: () => void, icon: string, label: string, locked = false
  ) => (
    <button onClick={locked ? onUpgrade : onClick} style={{
      flex: 1, minWidth: 110, position: 'relative',
      padding: '11px 8px', borderRadius: 10,
      background: active ? '#1a1520' : 'var(--bg2)',
      border: `1px solid ${active ? 'var(--red)' : 'var(--border)'}`,
      color: locked ? '#555' : active ? 'var(--text)' : 'var(--muted)',
      fontSize: 13, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 5, transition: 'all .15s',
      fontFamily: 'var(--font-body)', opacity: locked ? 0.75 : 1,
    }}>
      {locked && <Lock size={11} style={{ position: 'absolute', top: 6, right: 8, color: '#555' }} />}
      <span style={{ fontSize: 20 }}>{icon}</span> {label}
    </button>
  )

  return (
    <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--white)' }}>
        📄 Générer un quiz depuis un document
      </h2>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          background: dragging ? '#1a1520' : 'var(--bg2)',
          border: `2px dashed ${dragging || files.length > 0 ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 16, padding: '3rem 2rem', textAlign: 'center',
          cursor: 'pointer', transition: 'all .25s',
        }}
      >
        <input
          ref={inputRef} type="file" accept=".pdf,.txt,.md" multiple
          style={{ display: 'none' }}
          onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
        />
        {files.length > 0 ? (
          <>
            <FileText size={40} color="var(--green)" style={{ marginBottom: 12 }} />
            <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--green)', marginBottom: 4 }}>
              {files.length === 1 ? files[0].name : `${files.length} documents sélectionnés`}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {hasAdvancedAccess ? `cliquez pour ajouter (max ${MAX_FILES})` : 'cliquez pour changer'}
            </p>
          </>
        ) : (
          <>
            <UploadCloud size={40} color="var(--muted)" style={{ marginBottom: 12 }} />
            <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: 4 }}>Glissez vos fichiers ici</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>ou cliquez pour parcourir</p>
            <p style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
              PDF, TXT, MD — max 50 Mo{hasAdvancedAccess ? ` — jusqu'à ${MAX_FILES} documents (ex: toutes les sessions d'une UA)` : ''}
            </p>
          </>
        )}
      </div>

      {/* Liste des fichiers (si plusieurs ou pour retirer) */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '.75rem' }}>
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
            }}>
              <FileText size={15} color="var(--muted)" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} Ko</span>
              <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
          ))}
          {hasAdvancedAccess && files.length < MAX_FILES && (
            <button onClick={() => inputRef.current?.click()} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px', background: 'transparent', border: '1px dashed var(--border)',
              borderRadius: 8, color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
            }}>
              <Plus size={13} /> Ajouter un autre document ({files.length}/{MAX_FILES})
            </button>
          )}
        </div>
      )}

      {extractError && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          marginTop: '1rem', padding: '10px 14px',
          background: '#2a0f0f', border: '1px solid var(--red)',
          borderRadius: 8, color: '#f87171', fontSize: 13,
        }}>
          <AlertCircle size={16} /> {extractError}
        </div>
      )}

      {/* Nombre de questions */}
      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: '.6rem' }}>Nombre de questions</p>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          {optBtn(numQ === 10, () => setNumQ(10), '📝', '10 questions')}
          {optBtn(numQ === 20, () => setNumQ(20), '📚', '20 questions')}
          {optBtn(numQ === 35, () => setNumQ(35), '📖', '35 questions', !hasAdvancedAccess)}
        </div>
      </div>

      {/* Mode de réponse */}
      <div style={{ marginTop: '1.25rem' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: '.6rem' }}>Type de réponse</p>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          {optBtn(answerMode === 'mcq', () => setAnswerMode('mcq'), '🔘', 'Choix multiples')}
          {optBtn(answerMode === 'mixed', () => setAnswerMode('mixed'), '✍️', 'Choix multiples + écrit', !hasAdvancedAccess)}
        </div>
        {answerMode === 'mixed' && hasAdvancedAccess && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            L'IA choisit elle-même quelles questions demandent une réponse écrite, et corrige automatiquement à la fin.
          </p>
        )}
      </div>

      {/* Type */}
      <div style={{ marginTop: '1.25rem' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: '.6rem' }}>Type de questions</p>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          {optBtn(qType === 'all',         () => setQType('all'),         '🔀', 'Tous les types')}
          {optBtn(qType === 'facts',       () => setQType('facts'),       '📌', 'Faits clés')}
          {optBtn(qType === 'dates',       () => setQType('dates'),       '📅', 'Dates')}
          {optBtn(qType === 'definitions', () => setQType('definitions'), '💡', 'Définitions')}
        </div>
      </div>

      {/* Langue */}
      <div style={{ marginTop: '1.25rem' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: '.6rem' }}>Langue du quiz</p>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          {optBtn(lang === 'fr', () => setLang('fr'), '🇫🇷', 'Français')}
          {optBtn(lang === 'en', () => setLang('en'), '🇬🇧', 'English')}
        </div>
      </div>

      {/* Consignes du professeur */}
      <div style={{ marginTop: '1.25rem' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: '.6rem' }}>
          Consignes du professeur <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span>
        </p>
        {hasAdvancedAccess ? (
          <textarea
            value={teacherSpecs}
            onChange={e => setTeacherSpecs(e.target.value)}
            placeholder="ex : L'examen porte surtout sur les chapitres 3 à 5, pas de calculatrice, insister sur les formules — colle ici tout ce que le prof a précisé pour l'examen."
            rows={4}
            style={{
              width: '100%', padding: '12px 14px', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 10,
              color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)',
              boxSizing: 'border-box', resize: 'vertical',
            }}
          />
        ) : (
          <button onClick={onUpgrade} style={{
            width: '100%', padding: '14px', background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 10,
            color: '#555', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Lock size={13} /> Ajouter les consignes du professeur pour un examen plus précis
          </button>
        )}
        {hasAdvancedAccess && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            L'IA en tient compte pour cibler les bons chapitres, respecter les contraintes et coller au style d'examen annoncé.
          </p>
        )}
      </div>

      {/* Bouton générer */}
      <button
        onClick={handleGenerate}
        disabled={files.length === 0 || loading}
        style={{
          width: '100%', marginTop: '1.5rem', padding: 14,
          background: files.length === 0 || loading ? '#2a2a3a' : 'var(--red)',
          border: 'none', borderRadius: 10,
          color: files.length === 0 || loading ? '#555' : '#fff',
          fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 600,
          cursor: files.length === 0 || loading ? 'not-allowed' : 'pointer',
          transition: 'background .2s',
        }}
      >
        {loading ? `⏳ ${loadingStep || 'Extraction du texte…'}` : '⚡ Générer le quiz avec l\'IA'}
      </button>
    </div>
  )
}
