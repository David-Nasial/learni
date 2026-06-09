// ─── Page Résultats ───────────────────────────────────────────────────────────
import type { QuizSession, Page } from '../types'

interface Props {
  session: QuizSession
  answers: (number | null)[]
  onNavigate: (page: Page) => void
  onRestart: () => void
  onUpgrade: () => void
}

export function ResultsPage({ session, answers, onNavigate, onRestart, onUpgrade }: Props) {
  const correct = answers.filter((a, i) => a === session.questions[i].answerIndex).length
  const total = session.questions.length
  const pct = Math.round((correct / total) * 100)

  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'
  const msg   = pct >= 80 ? 'Excellent travail !' : pct >= 60 ? 'Bon résultat, continuez !' : 'À réviser davantage.'
  const ringColor = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--gold)' : '#ef4444'

  return (
    <div className="fade-in" style={{
      maxWidth: 560, margin: '0 auto', padding: '2rem 1.5rem', textAlign: 'center',
    }}>
      {/* Ring score */}
      <div style={{
        width: 140, height: 140, borderRadius: '50%',
        border: `8px solid ${ringColor}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1.5rem',
      }}>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--white)' }}>
          {pct}%
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Score</span>
      </div>

      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', color: 'var(--white)', marginBottom: '.5rem' }}>
        {emoji} {msg}
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.75rem' }}>
        Vous avez répondu correctement à {correct} question{correct > 1 ? 's' : ''} sur {total}.
      </p>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { n: correct,         l: 'Correctes',   color: 'var(--green)' },
          { n: total - correct, l: 'Incorrectes',  color: '#ef4444' },
          { n: total,           l: 'Total',        color: 'var(--text)' },
        ].map(s => (
          <div key={s.l} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '1rem 1.5rem', minWidth: 110,
          }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.n}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Mauvaises réponses */}
      {pct < 80 && (
        <div style={{
          textAlign: 'left', marginBottom: '1.5rem',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1rem 1.25rem',
        }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '.75rem' }}>❌ Questions manquées :</p>
          {session.questions.map((q, i) => {
            if (answers[i] === q.answerIndex) return null
            return (
              <div key={q.id} style={{ marginBottom: '.75rem', paddingBottom: '.75rem', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{q.question}</p>
                <p style={{ fontSize: 12, color: 'var(--green)' }}>✓ {q.choices[q.answerIndex]}</p>
              </div>
            )
          })}
          <div style={{
            marginTop: '.5rem', padding: '10px 12px',
            background: '#1a1033', borderRadius: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: '#a78bfa' }}>🤖 Obtenir des explications IA détaillées</span>
            <button onClick={onUpgrade} style={{
              padding: '5px 12px', background: 'var(--purple)', border: 'none',
              borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-body)',
            }}>
              Pro →
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onRestart} style={{
          padding: '12px 24px', background: 'var(--red)', border: 'none',
          borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600,
          fontFamily: 'var(--font-body)',
        }}>🔁 Recommencer</button>
        <button onClick={() => onNavigate('upload')} style={{
          padding: '12px 24px', background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: 10,
          color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
        }}>📄 Nouveau quiz</button>
        <button onClick={() => onUpgrade()} style={{
          padding: '12px 24px', background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: 10,
          color: 'var(--purple-l)', fontSize: 14, fontFamily: 'var(--font-body)',
        }}>📤 Exporter PDF</button>
      </div>
    </div>
  )
}
