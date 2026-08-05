// ─── Page Quiz ────────────────────────────────────────────────────────────────
import { useState } from 'react'
import type { QuizSession } from '../types'

interface Props {
  session: QuizSession
  onFinish: (answers: (number | string | null)[]) => void
}

export function QuizPage({ session, onFinish }: Props) {
  const [answers, setAnswers] = useState<(number | string | null)[]>(
    Array(session.questions.length).fill(null)
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [writtenText, setWrittenText] = useState('')
  const [validated, setValidated] = useState(false)

  const { currentIndex } = session
  const question = session.questions[currentIndex]
  const totalQ = session.questions.length
  const progress = Math.round((currentIndex / totalQ) * 100)

  // Le score en direct ne compte que les QCM déjà répondus — les réponses
  // écrites sont corrigées par l'IA seulement à la fin du quiz.
  const mcqSoFar = session.questions.slice(0, currentIndex).filter(q => q.type === 'mcq')
  const correctSoFar = mcqSoFar.filter((q, i) => answers[i] === q.answerIndex).length
  const scorePct = mcqSoFar.length > 0 ? Math.round((correctSoFar / mcqSoFar.length) * 100) : 0

  const handleSelect = (i: number) => {
    if (validated) return
    setSelected(i)
  }

  const handleValidate = () => {
    if (question.type === 'mcq') {
      if (selected === null) return
      const newAnswers = [...answers]
      newAnswers[currentIndex] = selected
      setAnswers(newAnswers)
      setValidated(true)
    } else {
      if (!writtenText.trim()) return
      const newAnswers = [...answers]
      newAnswers[currentIndex] = writtenText.trim()
      setAnswers(newAnswers)
      setValidated(true)
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 >= totalQ) {
      onFinish(answers)
    } else {
      setSelected(null)
      setWrittenText('')
      setValidated(false)
      // Hack: on mutate session.currentIndex (parent passera une nouvelle session)
      session.currentIndex += 1
      // Force re-render
      setAnswers([...answers])
    }
  }

  const choiceStyle = (i: number): React.CSSProperties => {
    if (!validated) return {
      background: selected === i ? '#1a1520' : 'var(--bg2)',
      border: `1px solid ${selected === i ? 'var(--red)' : 'var(--border)'}`,
      color: 'var(--text)',
    }
    if (i === question.answerIndex) return {
      background: '#0f2a18', border: '1px solid var(--green)', color: '#4ade80',
    }
    if (i === selected && selected !== question.answerIndex) return {
      background: '#2a0f0f', border: '1px solid #ef4444', color: '#f87171',
    }
    return { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--muted)' }
  }

  const canValidate = question.type === 'mcq' ? selected !== null : writtenText.trim() !== ''

  return (
    <div className="fade-in" style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--muted)', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>Score : {scorePct}%</span>
        <span>Question : {currentIndex + 1}/{totalQ}</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 10, marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--red)', borderRadius: 10, transition: 'width .4s' }} />
      </div>

      {/* Badges topic + type */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {question.topic && (
          <div style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: 20,
            background: 'var(--bg3)', fontSize: 12, color: 'var(--muted)',
          }}>
            📚 {question.topic}
          </div>
        )}
        {question.type === 'written' && (
          <div style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: 20,
            background: '#2d1b69', fontSize: 12, color: '#a78bfa',
          }}>
            ✍️ Réponse écrite
          </div>
        )}
      </div>

      {/* Question */}
      <h2 style={{
        fontFamily: 'var(--font-head)', fontSize: 'clamp(1.1rem,3vw,1.4rem)',
        fontWeight: 700, color: 'var(--white)', marginBottom: '1.5rem', lineHeight: 1.4,
      }}>
        {question.question}
      </h2>

      {question.type === 'mcq' ? (
        <>
          {/* Choices */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {question.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                style={{
                  ...choiceStyle(i),
                  borderRadius: 12, padding: '14px 18px',
                  fontSize: 15, textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                  cursor: validated ? 'default' : 'pointer',
                  transition: 'all .15s',
                }}
              >
                {choice}
              </button>
            ))}
          </div>

          {/* Explication */}
          {validated && (
            <div style={{
              marginTop: '1rem', padding: '1rem',
              background: 'var(--bg3)',
              borderLeft: '3px solid var(--red)',
              borderRadius: '0 8px 8px 0',
              fontSize: 13, color: 'var(--muted)', lineHeight: 1.6,
            }}>
              💡 {question.explanation}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Réponse écrite */}
          <textarea
            value={writtenText}
            onChange={e => !validated && setWrittenText(e.target.value)}
            readOnly={validated}
            placeholder="Écris ta réponse ici…"
            rows={5}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-body)',
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          {validated && (
            <div style={{
              marginTop: '1rem', padding: '1rem',
              background: '#1a1033',
              borderLeft: '3px solid var(--purple)',
              borderRadius: '0 8px 8px 0',
              fontSize: 13, color: '#a78bfa', lineHeight: 1.6,
            }}>
              ✓ Réponse enregistrée — elle sera corrigée par l'IA à la fin du quiz.
            </div>
          )}
        </>
      )}

      {/* Bouton valider / suivant */}
      <button
        onClick={validated ? handleNext : handleValidate}
        disabled={!canValidate && !validated}
        style={{
          marginTop: '1.5rem', width: '100%', padding: 14,
          background: !canValidate && !validated ? '#2a2a3a' : 'var(--red)',
          border: 'none', borderRadius: 10,
          color: !canValidate && !validated ? '#555' : '#fff',
          fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 600,
          cursor: !canValidate && !validated ? 'not-allowed' : 'pointer',
        }}
      >
        {validated
          ? currentIndex + 1 >= totalQ ? 'Voir les résultats →' : 'Question suivante →'
          : 'Valider'}
      </button>
    </div>
  )
}
