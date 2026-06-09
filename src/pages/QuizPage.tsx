// ─── Page Quiz ────────────────────────────────────────────────────────────────
import { useState } from 'react'
import type { QuizSession } from '../types'

interface Props {
  session: QuizSession
  onFinish: (answers: (number | null)[]) => void
}

export function QuizPage({ session, onFinish }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(session.questions.length).fill(null)
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [validated, setValidated] = useState(false)

  const { currentIndex } = session
  const question = session.questions[currentIndex]
  const totalQ = session.questions.length
  const progress = Math.round((currentIndex / totalQ) * 100)

  const correctSoFar = answers.slice(0, currentIndex).filter(
    (a, i) => a === session.questions[i].answerIndex
  ).length
  const scorePct = currentIndex > 0 ? Math.round((correctSoFar / currentIndex) * 100) : 0

  const handleSelect = (i: number) => {
    if (validated) return
    setSelected(i)
  }

  const handleValidate = () => {
    if (selected === null) return
    const newAnswers = [...answers]
    newAnswers[currentIndex] = selected
    setAnswers(newAnswers)
    setValidated(true)
  }

  const handleNext = () => {
    if (currentIndex + 1 >= totalQ) {
      onFinish(answers)
    } else {
      // Avancer — parent gère currentIndex via session immutable
      // On passe les réponses à onFinish progressivement via un état interne
      setSelected(null)
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

      {/* Badge topic */}
      {question.topic && (
        <div style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: 20,
          background: 'var(--bg3)', fontSize: 12, color: 'var(--muted)', marginBottom: '1.25rem',
        }}>
          📚 {question.topic}
        </div>
      )}

      {/* Question */}
      <h2 style={{
        fontFamily: 'var(--font-head)', fontSize: 'clamp(1.1rem,3vw,1.4rem)',
        fontWeight: 700, color: 'var(--white)', marginBottom: '1.5rem', lineHeight: 1.4,
      }}>
        {question.question}
      </h2>

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

      {/* Bouton valider / suivant */}
      <button
        onClick={validated ? handleNext : handleValidate}
        disabled={selected === null && !validated}
        style={{
          marginTop: '1.5rem', width: '100%', padding: 14,
          background: selected === null && !validated ? '#2a2a3a' : 'var(--red)',
          border: 'none', borderRadius: 10,
          color: selected === null && !validated ? '#555' : '#fff',
          fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 600,
          cursor: selected === null && !validated ? 'not-allowed' : 'pointer',
        }}
      >
        {validated
          ? currentIndex + 1 >= totalQ ? 'Voir les résultats →' : 'Question suivante →'
          : 'Valider'}
      </button>
    </div>
  )
}
