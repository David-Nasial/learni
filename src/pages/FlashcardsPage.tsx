import { useState, useCallback, useEffect, useRef } from 'react'
import { Loader, ChevronLeft, ChevronRight, RotateCcw, Upload, Trash2, RefreshCw, Plus, BookOpen } from 'lucide-react'
import {
  generateFlashcards,
  saveFlashcardSet, getFlashcardSets, updateFlashcardSet, deleteFlashcardSet,
  type FlashcardSet,
} from '../utils/supabase'
import { extractText } from '../utils/pdfExtract'
import { useAuth } from '../hooks/useAuth'
import type { Flashcard } from '../types'

type Step = 'library' | 'setup' | 'loading' | 'review'
type Lang = 'fr' | 'en'

// ─── Carte flip ───────────────────────────────────────────────────────────────
function Card({ card, index, total }: { card: Flashcard; index: number; total: number }) {
  const [flipped, setFlipped] = useState(false)

  // Reset flip quand on change de carte
  const prevIdx = useRef(index)
  useEffect(() => {
    if (prevIdx.current !== index) { setFlipped(false); prevIdx.current = index }
  }, [index])

  return (
    <div style={{ textAlign: 'center' }}>
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

      <div onClick={() => setFlipped(f => !f)} style={{ width: '100%', maxWidth: 520, margin: '0 auto', minHeight: 240, cursor: 'pointer', perspective: '1000px' }}>
        <div style={{
          position: 'relative', width: '100%', minHeight: 240,
          transformStyle: 'preserve-3d',
          transition: 'transform .5s ease',
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}>
          {/* Recto */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #12101e, #1a1033)',
            border: '1px solid #3d2b6b', borderRadius: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem',
          }}>
            <div style={{ fontSize: 11, color: '#a78bfa', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Recto — Clique pour révéler
            </div>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.1rem,3vw,1.5rem)', fontWeight: 700, color: 'var(--white)', lineHeight: 1.4, textAlign: 'center' }}>
              {card.front}
            </p>
          </div>

          {/* Verso */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #0f2318, #0d1f14)',
            border: '1px solid #1a4a3a', borderRadius: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem',
          }}>
            <div style={{ fontSize: 11, color: '#6ee7b7', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Verso — Réponse
            </div>
            <p style={{ fontSize: 'clamp(.95rem,2.5vw,1.15rem)', color: 'var(--text)', lineHeight: 1.7, textAlign: 'center' }}>
              {card.back}
            </p>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#555', marginTop: '1rem' }}>Cliquez sur la carte pour la retourner</p>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export function FlashcardsPage() {
  const { user } = useAuth()

  const [step,     setStep]     = useState<Step>('library')
  const [sets,     setSets]     = useState<FlashcardSet[]>([])
  const [loadingSets, setLoadingSets] = useState(true)

  // Set actif en révision
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null)
  const [cards,     setCards]     = useState<Flashcard[]>([])
  const [index,     setIndex]     = useState(0)
  const [error,     setError]     = useState('')

  // Génération
  const [file,       setFile]     = useState<File | null>(null)
  const [pastedText, setPasted]   = useState('')
  const [numCards,   setNumCards] = useState(15)
  const [lang,       setLang]     = useState<Lang>('fr')
  const [inputMode,  setInput]    = useState<'file' | 'text'>('file')
  const [generating, setGenerating] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Charger les sets sauvegardés
  useEffect(() => {
    if (!user) { setLoadingSets(false); return }
    getFlashcardSets(user.id)
      .then(setSets)
      .catch(() => {})
      .finally(() => setLoadingSets(false))
  }, [user])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setInput('file') }
  }, [])

  // ── Créer un nouveau set ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setError('')
    let text = ''
    let title = 'Nouveau jeu'

    if (inputMode === 'file') {
      if (!file) { setError('Veuillez sélectionner un fichier.'); return }
      try { text = await extractText(file) } catch (err) { setError(err instanceof Error ? err.message : 'Impossible de lire ce fichier.'); return }
      title = file.name.replace(/\.[^.]+$/, '')
    } else {
      text = pastedText.trim()
      if (!text) { setError('Veuillez coller du texte.'); return }
      title = text.slice(0, 40).trim() + '…'
    }

    if (text.length < 100) { setError('Le texte est trop court pour générer des flashcards.'); return }

    setGenerating(true)
    setStep('loading')
    try {
      const result = await generateFlashcards(text, numCards, lang, title)
      let saved: FlashcardSet | null = null
      if (user) {
        saved = await saveFlashcardSet(user.id, title, title, text, result)
        setSets(prev => [saved!, ...prev])
      }
      setCards(result)
      setIndex(0)
      setActiveSet(saved)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération.')
      setStep('setup')
    } finally {
      setGenerating(false)
    }
  }

  // ── Régénérer (nouvelles cartes sur le même document) ──────────────────────
  const handleRegenerate = async () => {
    if (!activeSet) return
    setRegenerating(true)
    try {
      const newCards = await generateFlashcards(
        activeSet.source_text,
        numCards,
        lang,
        activeSet.title,
        cards  // cartes déjà vues → l'IA génère des cartes différentes
      )
      // On accumule les nouvelles cartes dans le set sauvegardé
      const merged = [...cards, ...newCards]
      await updateFlashcardSet(activeSet.id, merged)
      setSets(prev => prev.map(s => s.id === activeSet.id ? { ...s, cards: merged } : s))
      setCards(newCards)
      setIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la régénération.')
    } finally {
      setRegenerating(false)
    }
  }

  // ── Supprimer un set ────────────────────────────────────────────────────────
  const handleDelete = async (setId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Supprimer ce jeu de flashcards ?')) return
    setDeletingId(setId)
    try {
      await deleteFlashcardSet(setId)
      setSets(prev => prev.filter(s => s.id !== setId))
      if (activeSet?.id === setId) { setActiveSet(null); setStep('library') }
    } catch {
      setError('Impossible de supprimer ce jeu.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Ouvrir un set existant ──────────────────────────────────────────────────
  const openSet = (s: FlashcardSet) => {
    setActiveSet(s)
    setCards(s.cards as Flashcard[])
    setIndex(0)
    setStep('review')
  }

  const prev = () => setIndex(i => Math.max(0, i - 1))
  const next = () => setIndex(i => Math.min(cards.length - 1, i + 1))

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
  if (step === 'review' && cards.length > 0) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem' }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <button onClick={() => setStep('library')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
          }}>
            <ChevronLeft size={16} /> Ma bibliothèque
          </button>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)', textAlign: 'center', flex: 1 }}>
            {activeSet?.title ?? 'Flashcards'}
          </h1>
          <div style={{ width: 100 }} />
        </div>

        <Card card={cards[index]} index={index} total={cards.length} />

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <button onClick={prev} disabled={index === 0} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 22px', background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 10,
            color: index === 0 ? '#555' : 'var(--text)', cursor: index === 0 ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600,
          }}>
            <ChevronLeft size={16} /> Précédente
          </button>
          <button onClick={next} disabled={index === cards.length - 1} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 22px',
            background: index === cards.length - 1 ? 'var(--bg2)' : 'var(--purple)',
            border: '1px solid var(--border)', borderRadius: 10,
            color: index === cards.length - 1 ? '#555' : '#fff', cursor: index === cards.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600,
          }}>
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

        {/* Actions — régénérer + supprimer */}
        {activeSet && (
          <div style={{ display: 'flex', gap: '.75rem', marginTop: '2rem', justifyContent: 'center' }}>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              title="J'ai maîtrisé ces cartes — donne-moi de nouvelles questions sur le même document"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10,
                background: 'var(--bg2)', border: '1px solid #3d2b6b',
                color: '#a78bfa', cursor: regenerating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              {regenerating
                ? <><Loader size={15} className="spin" /> Génération…</>
                : <><RefreshCw size={15} /> Nouvelles cartes</>}
            </button>

            <button
              onClick={(e) => handleDelete(activeSet.id, e)}
              disabled={deletingId === activeSet.id}
              title="Supprimer ce jeu de flashcards"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10,
                background: 'var(--bg2)', border: '1px solid #4a1515',
                color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              <Trash2 size={15} /> Supprimer
            </button>
          </div>
        )}

        {error && (
          <div style={{ padding: '10px 14px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginTop: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  // ── Bibliothèque ─────────────────────────────────────────────────────────────
  if (step === 'library') {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.25rem' }}>
              🃏 Mes Flashcards
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              {sets.length} jeu{sets.length > 1 ? 'x' : ''} de cartes
            </p>
          </div>
          <button onClick={() => { setStep('setup'); setError('') }} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', background: 'var(--purple)', border: 'none',
            borderRadius: 10, color: '#fff', fontFamily: 'var(--font-head)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            <Plus size={16} /> Nouveau jeu
          </button>
        </div>

        {loadingSets ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            <Loader size={28} className="spin" style={{ color: 'var(--purple)' }} />
          </div>
        ) : sets.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3rem 2rem',
            background: 'var(--bg2)', border: '2px dashed var(--border)', borderRadius: 20,
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🃏</div>
            <h2 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '.5rem' }}>
              Aucun jeu de flashcards
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.5rem' }}>
              Crée ton premier jeu depuis un PDF ou du texte.
            </p>
            <button onClick={() => setStep('setup')} style={{
              padding: '11px 24px', background: 'var(--purple)', border: 'none',
              borderRadius: 10, color: '#fff', fontFamily: 'var(--font-head)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Créer mon premier jeu →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sets.map(s => (
              <div
                key={s.id}
                onClick={() => openSet(s)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '1.25rem 1.5rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                  transition: 'border-color .2s, transform .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, #2d1b69, #1a1033)',
                    border: '1px solid #3d2b6b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                  }}>
                    🃏
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '.95rem', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      <BookOpen size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {(s.cards as Flashcard[]).length} cartes · {new Date(s.created_at).toLocaleDateString('fr-CA')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, padding: '3px 10px', background: '#2d1b69', borderRadius: 20 }}>
                    Réviser →
                  </span>
                  <button
                    onClick={(e) => handleDelete(s.id, e)}
                    disabled={deletingId === s.id}
                    title="Supprimer"
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: 'transparent', border: '1px solid #4a1515',
                      color: '#f87171', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {deletingId === s.id ? <Loader size={13} className="spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Setup — créer un nouveau jeu ─────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem' }} className="fade-in">
      <button onClick={() => setStep('library')} style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1.5rem',
        background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
      }}>
        <ChevronLeft size={16} /> Ma bibliothèque
      </button>

      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.4rem' }}>
        🃏 Nouveau jeu de flashcards
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
        Importez un document ou collez du texte — l'IA génère des cartes recto/verso personnalisées.
      </p>

      {error && (
        <div style={{ padding: '12px 16px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: '1.5rem' }}>
          ❌ {error}
        </div>
      )}

      {/* Onglets */}
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
            marginBottom: '1.5rem', transition: 'border-color .2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <input
            id="fc-file-input" type="file" accept=".pdf,.txt,.md"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }}
          />
          <Upload size={28} style={{ color: 'var(--muted)', marginBottom: '.75rem' }} />
          {file ? (
            <p style={{ color: 'var(--white)', fontWeight: 600 }}>📄 {file.name}</p>
          ) : (
            <>
              <p style={{ color: 'var(--text)', marginBottom: '.3rem' }}>Glissez un fichier ici</p>
              <p style={{ color: '#555', fontSize: 12 }}>PDF, TXT, MD — max 50 Mo</p>
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
          <select value={numCards} onChange={e => setNumCards(Number(e.target.value))} style={{
            width: '100%', padding: '9px 12px',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', fontSize: 14,
          }}>
            <option value={10}>10 cartes</option>
            <option value={15}>15 cartes</option>
            <option value={20}>20 cartes</option>
            <option value={30}>30 cartes</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Langue</label>
          <select value={lang} onChange={e => setLang(e.target.value as Lang)} style={{
            width: '100%', padding: '9px 12px',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', fontSize: 14,
          }}>
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>
      </div>

      <button onClick={handleGenerate} disabled={generating} style={{
        width: '100%', padding: '14px', borderRadius: 12,
        background: generating ? '#333' : 'var(--purple)', border: 'none', color: '#fff',
        fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700,
        cursor: generating ? 'not-allowed' : 'pointer',
        boxShadow: generating ? 'none' : '0 0 24px rgba(139,92,246,.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {generating ? <><Loader size={16} className="spin" /> Génération…</> : '✨ Générer mes flashcards'}
      </button>
    </div>
  )
}
