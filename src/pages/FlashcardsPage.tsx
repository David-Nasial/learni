import { useState, useCallback } from 'react'
import { Loader, ChevronLeft, ChevronRight, RotateCcw, Upload } from 'lucide-react'
import { generateFlashcards } from '../utils/supabase'
import type { Flashcard } from '../types'

type Step = 'setup' | 'loading' | 'review'
type Lang = 'fr' | 'en'

function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve((e.target?.result as string) ?? '')
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'))
    reader.readAsText(file)
  })
}

// ─── Carte individuelle ───────────────────────────────────────────────────────
function Card({ card, index, total }: { card: Flashcard; index: number; total: number }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Compteur */}
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1rem' }}>
        Carte {index + 1} / {total}
        {card.topic && (
          <span style={{
            marginLeft: 10, padding: '2px 10px', borderRadius: 20,
            background: '#2d1b69', color: '#a78bfa', fontSize: 11, fontWeight: 600,
          }}>
            {card.topic}
          </span>
        )}
      </div>

      {/* Carte flip */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          width: '100%', maxWidth: 520, margin: '0 auto',
          minHeight: 240, cursor: 'pointer',
          perspective: '1000px',
        }}
      >
        <div style={{
          position: 'relative', width: '100%', minHeight: 240,
          transformStyle: 'preserve-3d',
          transition: 'transform .5s ease',
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}>
          {/* Recto */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #12101e, #1a1033)',
            border: '1px solid #3d2b6b', borderRadius: 20,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
          }}>
            <div style={{ fontSize: 11, color: '#a78bfa', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Recto — Clique pour révéler
            </div>
            <p style={{
              fontFamily: 'var(--font-head)', fontSize: 'clamp(1.1rem,3vw,1.5rem)',
              fontWeight: 700, color: 'var(--white)', lineHeight: 1.4, textAlign: 'center',
            }}>
              {card.front}
            </p>
          </div>

          {/* Verso */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #0f2318, #0d1f14)',
            border: '1px solid #1a4a3a', borderRadius: 20,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
          }}>
            <div style={{ fontSize: 11, color: '#6ee7b7', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Verso — Réponse
            </div>
            <p style={{
              fontSize: 'clamp(.95rem,2.5vw,1.15rem)',
              color: 'var(--text)', lineHeight: 1.7, textAlign: 'center',
            }}>
              {card.back}
            </p>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#555', marginTop: '1rem' }}>
        Cliquez sur la carte pour la retourner
      </p>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export function FlashcardsPage() {
  const [step,    setStep]    = useState<Step>('setup')
  const [cards,   setCards]   = useState<Flashcard[]>([])
  const [index,   setIndex]   = useState(0)
  const [error,   setError]   = useState('')

  // Config
  const [file,     setFile]     = useState<File | null>(null)
  const [pastedText, setPasted] = useState('')
  const [numCards, setNumCards] = useState(15)
  const [lang,     setLang]     = useState<Lang>('fr')
  const [inputMode, setInput]   = useState<'file' | 'text'>('file')

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setInput('file') }
  }, [])

  const handleGenerate = async () => {
    setError('')
    let text = ''
    let title = 'document'

    if (inputMode === 'file') {
      if (!file) { setError('Veuillez sélectionner un fichier.'); return }
      try { text = await extractTextFromFile(file) } catch { setError('Impossible de lire ce fichier.'); return }
      title = file.name.replace(/\.[^.]+$/, '')
    } else {
      text = pastedText.trim()
      if (!text) { setError('Veuillez coller du texte.'); return }
    }

    if (text.length < 100) { setError('Le texte est trop court pour générer des flashcards.'); return }

    setStep('loading')
    try {
      const result = await generateFlashcards(text, numCards, lang, title)
      setCards(result)
      setIndex(0)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération.')
      setStep('setup')
    }
  }

  const prev = () => setIndex(i => Math.max(0, i - 1))
  const next = () => setIndex(i => Math.min(cards.length - 1, i + 1))

  const reset = () => { setStep('setup'); setCards([]); setIndex(0); setError('') }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader size={36} className="spin" style={{ color: 'var(--purple)' }} />
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>Génération des flashcards en cours…</p>
      </div>
    )
  }

  // ── Révision ─────────────────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem' }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--white)' }}>
            🃏 Flashcards
          </h1>
          <button onClick={reset} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
          }}>
            <RotateCcw size={14} /> Nouveau jeu
          </button>
        </div>

        <Card card={cards[index]} index={index} total={cards.length} />

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <button
            onClick={prev} disabled={index === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 22px', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 10,
              color: index === 0 ? '#555' : 'var(--text)', cursor: index === 0 ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            <ChevronLeft size={16} /> Précédente
          </button>
          <button
            onClick={next} disabled={index === cards.length - 1}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 22px', background: index === cards.length - 1 ? 'var(--bg2)' : 'var(--purple)',
              border: '1px solid var(--border)', borderRadius: 10,
              color: index === cards.length - 1 ? '#555' : '#fff', cursor: index === cards.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            Suivante <ChevronRight size={16} />
          </button>
        </div>

        {/* Barre de progression */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ background: 'var(--bg2)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, var(--purple), var(--red))',
              width: `${((index + 1) / cards.length) * 100}%`,
              transition: 'width .3s ease',
            }} />
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#555', marginTop: 6 }}>
            {index + 1} / {cards.length} cartes
          </p>
        </div>
      </div>
    )
  }

  // ── Setup ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem' }} className="fade-in">
      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.4rem' }}>
        🃏 Flashcards IA
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
        Importez un document ou collez du texte — l'IA génère des cartes recto/verso à mémoriser.
      </p>

      {error && (
        <div style={{ padding: '12px 16px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: '1.5rem' }}>
          ❌ {error}
        </div>
      )}

      {/* Onglets fichier / texte */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
        {(['file', 'text'] as const).map(mode => (
          <button key={mode} onClick={() => setInput(mode)} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: inputMode === mode ? 'var(--purple)' : 'var(--bg2)',
            border: `1px solid ${inputMode === mode ? 'var(--purple)' : 'var(--border)'}`,
            color: inputMode === mode ? '#fff' : 'var(--muted)',
          }}>
            {mode === 'file' ? '📄 Fichier' : '📝 Texte'}
          </button>
        ))}
      </div>

      {/* Zone fichier */}
      {inputMode === 'file' ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => document.getElementById('fc-file-input')?.click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 14,
            padding: '2.5rem 1.5rem', textAlign: 'center', cursor: 'pointer',
            background: file ? '#12101e' : 'transparent',
            transition: 'border-color .2s',
            marginBottom: '1.5rem',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <input
            id="fc-file-input"
            type="file"
            accept=".txt,.md,.csv,.json"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }}
          />
          <Upload size={28} style={{ color: 'var(--muted)', marginBottom: '.75rem' }} />
          {file ? (
            <p style={{ color: 'var(--white)', fontWeight: 600 }}>📄 {file.name}</p>
          ) : (
            <>
              <p style={{ color: 'var(--text)', marginBottom: '.3rem' }}>Glissez un fichier ici</p>
              <p style={{ color: '#555', fontSize: 12 }}>.txt, .md, .csv, .json</p>
            </>
          )}
        </div>
      ) : (
        <textarea
          value={pastedText}
          onChange={e => setPasted(e.target.value)}
          placeholder="Collez votre cours, vos notes ou n'importe quel texte ici…"
          rows={8}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 14px',
            color: 'var(--text)', fontSize: 14, lineHeight: 1.6,
            resize: 'vertical', marginBottom: '1.5rem', fontFamily: 'inherit',
          }}
        />
      )}

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Nombre de cartes</label>
          <select
            value={numCards}
            onChange={e => setNumCards(Number(e.target.value))}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 14,
            }}
          >
            <option value={10}>10 cartes</option>
            <option value={15}>15 cartes</option>
            <option value={20}>20 cartes</option>
            <option value={30}>30 cartes</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Langue</label>
          <select
            value={lang}
            onChange={e => setLang(e.target.value as Lang)}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 14,
            }}
          >
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: 'var(--purple)', border: 'none', color: '#fff',
          fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 0 24px rgba(139,92,246,.3)',
        }}
      >
        ✨ Générer mes flashcards
      </button>
    </div>
  )
}
