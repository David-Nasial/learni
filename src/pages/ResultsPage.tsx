// ─── Page Résultats ───────────────────────────────────────────────────────────
import type { QuizSession, Page, WrittenGrade, Plan } from '../types'

interface Props {
  session: QuizSession
  answers: (number | string | null)[]
  writtenGrading: Record<number, WrittenGrade>
  onNavigate: (page: Page) => void
  onRestart: () => void
  onUpgrade: () => void
  plan?: Plan
  isSuperadmin?: boolean
}

export function ResultsPage({ session, answers, writtenGrading, onNavigate, onRestart, onUpgrade, plan, isSuperadmin }: Props) {
  // Les explications détaillées font partie des plans payants — inutile (et vexant)
  // de proposer d'y « passer » à quelqu'un qui les a déjà.
  const hasPaidPlan = !!isSuperadmin || (!!plan && plan !== 'free')

  const isCorrect = (q: QuizSession['questions'][number], i: number) =>
    q.type === 'mcq' ? answers[i] === q.answerIndex : writtenGrading[i]?.isCorrect === true

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Export via la boîte d'impression du navigateur : « Enregistrer en PDF » y est
  // disponible sur tous les systèmes, sans embarquer de librairie PDF.
  const handleExport = () => {
    if (!hasPaidPlan) { onUpgrade(); return }

    const rows = session.questions.map((q, i) => {
      const ok = isCorrect(q, i)
      const given = q.type === 'mcq'
        ? (typeof answers[i] === 'number' ? q.choices[answers[i] as number] : 'Sans réponse')
        : (String(answers[i] ?? '').trim() || 'Sans réponse')
      const expected = q.type === 'mcq' ? q.choices[q.answerIndex] : (q.modelAnswer ?? '')
      return `
        <div class="q">
          <p class="qt">${i + 1}. ${escapeHtml(q.question)}</p>
          <p class="${ok ? 'ok' : 'ko'}">${ok ? '✓ Bonne réponse' : '✗ Réponse incorrecte'}</p>
          <p><strong>Ta réponse :</strong> ${escapeHtml(given)}</p>
          ${!ok && expected ? `<p><strong>Réponse attendue :</strong> ${escapeHtml(expected)}</p>` : ''}
          ${q.explanation ? `<p class="exp">${escapeHtml(q.explanation)}</p>` : ''}
        </div>`
    }).join('')

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <title>${escapeHtml(session.title)} — Résultats LearnI</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; color: #111; max-width: 720px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.6; }
        h1 { font-size: 1.4rem; margin-bottom: .2rem; }
        .meta { color: #666; font-size: .85rem; margin-bottom: 1.5rem; }
        .score { font-size: 1.1rem; font-weight: 700; margin-bottom: 2rem; }
        .q { border-top: 1px solid #ddd; padding: 1rem 0; page-break-inside: avoid; }
        .qt { font-weight: 600; margin-bottom: .4rem; }
        .ok { color: #157a3f; font-weight: 600; }
        .ko { color: #b3261e; font-weight: 600; }
        .exp { color: #555; font-size: .9rem; font-style: italic; }
        p { margin: .25rem 0; }
        footer { margin-top: 2.5rem; color: #888; font-size: .8rem; }
      </style></head><body>
      <h1>${escapeHtml(session.title)}</h1>
      <p class="meta">Quiz réalisé le ${new Date().toLocaleDateString('fr-CA')} · LearnI</p>
      <p class="score">Score : ${correct} / ${total} (${pct} %)</p>
      ${rows}
      <footer>Généré par LearnI</footer>
      </body></html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  const correct = session.questions.filter((q, i) => isCorrect(q, i)).length
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
            if (isCorrect(q, i)) return null
            return (
              <div key={q.id} style={{ marginBottom: '.75rem', paddingBottom: '.75rem', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{q.question}</p>
                {q.type === 'mcq' ? (
                  <p style={{ fontSize: 12, color: 'var(--green)' }}>✓ {q.choices[q.answerIndex]}</p>
                ) : (
                  <>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
                      Ta réponse : {typeof answers[i] === 'string' && answers[i] ? answers[i] as string : '(vide)'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--green)', marginBottom: 2 }}>✓ {q.modelAnswer}</p>
                    {writtenGrading[i]?.feedback && (
                      <p style={{ fontSize: 12, color: '#a78bfa' }}>🤖 {writtenGrading[i].feedback}</p>
                    )}
                  </>
                )}
              </div>
            )
          })}
          {!hasPaidPlan && (
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
          )}
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
        <button
          onClick={handleExport}
          title={hasPaidPlan ? 'Ouvre la boîte d\'impression — choisis « Enregistrer en PDF »' : undefined}
          style={{
            padding: '12px 24px', background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 10,
            color: 'var(--purple-l)', fontSize: 14, fontFamily: 'var(--font-body)',
          }}
        >
          📤 Exporter PDF
        </button>
      </div>
    </div>
  )
}
