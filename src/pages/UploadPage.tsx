// ─── Page Upload — Import PDF + options ───────────────────────────────────────
import { useState, useRef } from 'react'
import { UploadCloud, FileText, AlertCircle } from 'lucide-react'
import type { GenerateOptions, QuizLength, QuestionType, QuizLanguage } from '../types'
import { extractText } from '../utils/pdfExtract'

interface Props {
  onGenerate: (opts: GenerateOptions) => void
}

export function UploadPage({ onGenerate }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [extractError, setExtractError] = useState('')
  const [numQ, setNumQ] = useState<QuizLength>(10)
  const [qType, setQType] = useState<QuestionType>('all')
  const [lang, setLang] = useState<QuizLanguage>('fr')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setExtractError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleGenerate = async () => {
    if (!file) return
    setLoading(true)
    setExtractError('')
    try {
      const text = await extractText(file)
      if (!text.trim()) throw new Error('Le fichier semble vide ou illisible.')
      onGenerate({
        pdfText: text,
        numQuestions: numQ,
        questionType: qType,
        language: lang,
        documentTitle: file.name.replace(/\.[^.]+$/, ''),
      })
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Option button helper
  const optBtn = (
    active: boolean, onClick: () => void, icon: string, label: string
  ) => (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 110,
      padding: '11px 8px', borderRadius: 10,
      background: active ? '#1a1520' : 'var(--bg2)',
      border: `1px solid ${active ? 'var(--red)' : 'var(--border)'}`,
      color: active ? 'var(--text)' : 'var(--muted)',
      fontSize: 13, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 5, transition: 'all .15s',
      fontFamily: 'var(--font-body)',
    }}>
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
          border: `2px dashed ${dragging || file ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 16, padding: '3rem 2rem', textAlign: 'center',
          cursor: 'pointer', transition: 'all .25s',
        }}
      >
        <input
          ref={inputRef} type="file" accept=".pdf,.txt,.md"
          style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {file ? (
          <>
            <FileText size={40} color="var(--green)" style={{ marginBottom: 12 }} />
            <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--green)', marginBottom: 4 }}>{file.name}</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>{(file.size / 1024).toFixed(0)} Ko — cliquez pour changer</p>
          </>
        ) : (
          <>
            <UploadCloud size={40} color="var(--muted)" style={{ marginBottom: 12 }} />
            <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: 4 }}>Glissez votre fichier ici</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>ou cliquez pour parcourir</p>
            <p style={{ fontSize: 12, color: '#555', marginTop: 6 }}>PDF, TXT, MD — max 50 Mo</p>
          </>
        )}
      </div>

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
        </div>
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

      {/* Bouton générer */}
      <button
        onClick={handleGenerate}
        disabled={!file || loading}
        style={{
          width: '100%', marginTop: '1.5rem', padding: 14,
          background: !file || loading ? '#2a2a3a' : 'var(--red)',
          border: 'none', borderRadius: 10,
          color: !file || loading ? '#555' : '#fff',
          fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 600,
          cursor: !file || loading ? 'not-allowed' : 'pointer',
          transition: 'background .2s',
        }}
      >
        {loading ? '⏳ Extraction du texte…' : '⚡ Générer le quiz avec l\'IA'}
      </button>
    </div>
  )
}
