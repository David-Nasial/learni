// ─── Page Génération — Loading pendant l'appel IA ─────────────────────────────
import { useEffect, useState } from 'react'
import type { GenerateOptions, Question } from '../types'
import { generateQuestions } from '../utils/anthropic'

const steps = [
  'Extraction du contenu du document…',
  'Analyse du texte par l\'IA…',
  'Génération des questions…',
  'Formulation des choix de réponses…',
  'Préparation du quiz…',
]

interface Props {
  options: GenerateOptions
  onDone: (questions: Question[]) => void
  onError: (msg: string) => void
}

export function GeneratingPage({ options, onDone, onError }: Props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(s => Math.min(s + 1, steps.length - 1))
    }, 1400)

    generateQuestions(options)
      .then(qs => { clearInterval(timer); onDone(qs) })
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
      {/* Spinner */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--red)',
        marginBottom: '1.5rem',
      }} className="spin" />

      <h2 style={{
        fontFamily: 'var(--font-head)', fontSize: '1.2rem',
        color: 'var(--white)', marginBottom: '.5rem',
      }}>
        LearnI génère votre examen
      </h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '2rem' }}>
        {options.numQuestions} questions · {options.language === 'fr' ? 'Français' : 'English'}
      </p>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, width: '100%' }}>
        {steps.map((s, i) => (
          <div key={s} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: i <= step ? 1 : .25, transition: 'opacity .4s',
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: i < step ? 'var(--green)' : i === step ? 'var(--red)' : 'var(--bg3)',
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
