// ─── Page Correction — Loading pendant la correction IA des réponses écrites ──
import { useEffect, useState } from 'react'
import type { QuizSession, WrittenGrade } from '../types'
import { gradeWrittenAnswers } from '../utils/anthropic'

const steps = [
  'Lecture de vos réponses…',
  'Comparaison avec les corrigés…',
  'Rédaction des retours détaillés…',
]

interface Props {
  session: QuizSession
  answers: (number | string | null)[]
  language: 'fr' | 'en'
  onDone: (graded: Record<number, WrittenGrade>) => void
  onError: (msg: string) => void
}

export function GradingPage({ session, answers, language, onDone, onError }: Props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(s => Math.min(s + 1, steps.length - 1))
    }, 1000)

    const items = session.questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q.type === 'written')
      .map(({ q, i }) => ({
        index:       i,
        question:    q.question,
        modelAnswer: q.modelAnswer ?? '',
        keyPoints:   q.keyPoints ?? [],
        userAnswer:  typeof answers[i] === 'string' ? (answers[i] as string) : '',
      }))

    gradeWrittenAnswers(items, language)
      .then(graded => { clearInterval(timer); onDone(graded) })
      .catch(err => { clearInterval(timer); onError(err.message) })

    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fade-in" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 'calc(100vh - 64px)',
      padding: '2rem', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--purple)',
        marginBottom: '1.5rem',
      }} className="spin" />

      <h2 style={{
        fontFamily: 'var(--font-head)', fontSize: '1.2rem',
        color: 'var(--white)', marginBottom: '.5rem',
      }}>
        LearnI corrige vos réponses écrites
      </h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '2rem' }}>
        Quelques secondes, l'IA analyse vos réponses en profondeur
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, width: '100%' }}>
        {steps.map((s, i) => (
          <div key={s} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: i <= step ? 1 : .25, transition: 'opacity .4s',
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: i < step ? 'var(--green)' : i === step ? 'var(--purple)' : 'var(--bg3)',
              color: i <= step ? '#fff' : 'var(--muted)',
            }}>
              {i < step ? '✓' : i + 1}
            </span>
            <span style={{ fontSize: 13, color: i <= step ? 'var(--text)' : 'var(--muted)' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
