// ─── Page Historique ──────────────────────────────────────────────────────────
import type { QuizResult } from '../types'

interface Props {
  results: QuizResult[]
  onUpgrade: () => void
}

export function HistoryPage({ results, onUpgrade }: Props) {
  const avg = results.length
    ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)
    : 0
  const totalQ = results.reduce((a, r) => a + r.total, 0)

  const scoreColor = (s: number) =>
    s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--gold)' : '#ef4444'

  return (
    <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--white)' }}>
        📊 Mes résultats
      </h2>

      {/* Stats globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { n: results.length, l: 'Quiz complétés', c: 'var(--text)' },
          { n: `${avg}%`, l: 'Moyenne',        c: 'var(--green)' },
          { n: totalQ,        l: 'Questions',    c: 'var(--gold)' },
        ].map(s => (
          <div key={s.l} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '1rem', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 700, color: s.c }}>{s.n}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Liste */}
      {results.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3rem',
          background: 'var(--bg2)', borderRadius: 14,
          border: '1px solid var(--border)', color: 'var(--muted)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</p>
          <p>Aucun quiz complété pour l'instant.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {results.map(r => (
            <div key={r.id} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 2 }}>{r.title}</h4>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{r.date} · {r.total} questions</p>
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.2rem', fontWeight: 700, color: scoreColor(r.score) }}>
                {r.score}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upsell stats avancées */}
      <div style={{
        marginTop: '1.5rem', background: '#1a1033',
        border: '1px solid #4a3080', borderRadius: 14,
        padding: '1.25rem', textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#a78bfa', marginBottom: '.5rem' }}>
          📈 Graphiques de progression et statistiques avancées
        </p>
        <button onClick={onUpgrade} style={{
          padding: '8px 20px', background: 'var(--purple)',
          border: 'none', borderRadius: 8, color: '#fff',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
        }}>
          Débloquer avec Pro
        </button>
      </div>
    </div>
  )
}
