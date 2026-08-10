// ─── Page Historique ──────────────────────────────────────────────────────────
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { QuizResult, TopicResult } from '../types'
import type { Profile } from '../utils/supabase'

interface Props {
  results: QuizResult[]
  onUpgrade: () => void
  profile?: Profile | null
}

const scoreColor = (s: number) =>
  s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--gold)' : '#ef4444'

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.round((totalSeconds % 3600) / 60)
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}

// ─── Conseils de révision pour UN examen précis (jamais mélangé avec un autre) ─
function ResultAdvice({ topicResults }: { topicResults: TopicResult[] }) {
  const red    = topicResults.filter(t => t.correct === 0)
  const yellow = topicResults.filter(t => t.correct > 0 && t.correct < t.total)

  if (red.length === 0 && yellow.length === 0) {
    return (
      <p style={{ fontSize: 12.5, color: 'var(--green)', marginTop: 10 }}>
        ✅ Tous les thèmes de cet examen sont maîtrisés.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {red.map(t => (
        <div key={t.topic} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
          borderRadius: 8, background: '#2a0f0f', border: '1px solid #4a1515',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: '#f87171' }}>
            <strong>{t.topic}</strong> — {t.correct}/{t.total} bonne{t.total > 1 ? 's' : ''} réponse{t.total > 1 ? 's' : ''}, à reprendre en priorité
          </span>
        </div>
      ))}
      {yellow.map(t => (
        <div key={t.topic} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
          borderRadius: 8, background: '#2a1f00', border: '1px solid #4a3500',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: 'var(--gold)' }}>
            <strong>{t.topic}</strong> — {t.correct}/{t.total} bonnes réponses, à consolider
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Graphique : progression du score dans le temps ──────────────────────────
function ScoreTrendChart({ results }: { results: QuizResult[] }) {
  // results arrive du plus récent au plus ancien — on prend les 20 derniers et on les remet en ordre chronologique
  const chrono = [...results].slice(0, 20).reverse()
  const [hover, setHover] = useState<number | null>(null)

  if (chrono.length < 2) {
    return (
      <p style={{ color: 'var(--muted)', fontSize: 13, padding: '1rem 0' }}>
        Complète au moins 2 quiz pour voir ta courbe de progression.
      </p>
    )
  }

  const W = 640, H = 180, PAD_L = 32, PAD_R = 12, PAD_T = 14, PAD_B = 24
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const x = (i: number) => PAD_L + (chrono.length === 1 ? innerW / 2 : (i / (chrono.length - 1)) * innerW)
  const y = (score: number) => PAD_T + innerH - (score / 100) * innerH

  const points = chrono.map((r, i) => ({ x: x(i), y: y(r.score), r }))
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Grille horizontale — recessive */}
        {[0, 50, 100].map(v => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD_L - 8} y={y(v) + 3} textAnchor="end" fontSize={10} fill="var(--muted)">{v}</text>
          </g>
        ))}

        {/* Ligne de progression */}
        <path d={path} fill="none" stroke="var(--purple-l)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Points + zones de survol (cibles plus grandes que le point) */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="var(--purple-l)" stroke="var(--bg2)" strokeWidth={2} />
            <circle
              cx={p.x} cy={p.y} r={12} fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(h => h === i ? null : h)}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}
      </svg>

      {/* Étiquettes première/dernière date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: -4 }}>
        <span>{chrono[0].date}</span>
        <span>{chrono[chrono.length - 1].date}</span>
      </div>

      {hover !== null && (
        <div style={{
          position: 'absolute',
          left: `${(points[hover].x / W) * 100}%`,
          top: `${(points[hover].y / H) * 100}%`,
          transform: 'translate(-50%, -120%)',
          background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '6px 10px', fontSize: 12, color: 'var(--text)',
          whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.4)',
        }}>
          <strong style={{ color: scoreColor(chrono[hover].score) }}>{chrono[hover].score}%</strong>
          {' — '}{chrono[hover].title}
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>{chrono[hover].date}</div>
        </div>
      )}
    </div>
  )
}

// ─── Graphique : score moyen par sujet ────────────────────────────────────────
function SubjectBreakdownChart({ results }: { results: QuizResult[] }) {
  const bySubject = new Map<string, { sum: number; count: number }>()
  for (const r of results) {
    const e = bySubject.get(r.title) ?? { sum: 0, count: 0 }
    e.sum += r.score; e.count += 1
    bySubject.set(r.title, e)
  }
  const rows = Array.from(bySubject.entries())
    .map(([title, { sum, count }]) => ({ title, avg: Math.round(sum / count), count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6)

  if (rows.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(row => (
        <div key={row.title}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
              {row.title} <span style={{ color: 'var(--muted)' }}>({row.count})</span>
            </span>
            <span style={{ color: scoreColor(row.avg), fontWeight: 700 }}>{row.avg}%</span>
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{
              width: `${row.avg}%`, height: '100%', borderRadius: 4,
              background: scoreColor(row.avg), transition: 'width .4s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function HistoryPage({ results, onUpgrade, profile }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const avg = results.length
    ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)
    : 0
  const totalQ = results.reduce((a, r) => a + r.total, 0)
  const hasAdvancedStats = profile?.role === 'superadmin' || ['pro', 'autodidacte', 'teacher'].includes(profile?.plan ?? '')

  const bestScore = results.length ? Math.max(...results.map(r => r.score)) : 0
  const totalTime = results.reduce((a, r) => a + (r.durationSeconds ?? 0), 0)

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
          {results.map(r => {
            const hasAdvice = !!r.topicResults && r.topicResults.length > 0
            const isOpen = expandedId === r.id
            return (
              <div key={r.id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '1rem 1.25rem',
              }}>
                <div
                  onClick={() => hasAdvice && setExpandedId(isOpen ? null : r.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: hasAdvice ? 'pointer' : 'default' }}
                >
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 2 }}>{r.title}</h4>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>{r.date} · {r.total} questions</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.2rem', fontWeight: 700, color: scoreColor(r.score) }}>
                      {r.score}%
                    </div>
                    {hasAdvice && (isOpen ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />)}
                  </div>
                </div>
                {isOpen && hasAdvice && <ResultAdvice topicResults={r.topicResults!} />}
              </div>
            )
          })}
        </div>
      )}

      {hasAdvancedStats ? (
        results.length === 0 ? null : (
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Stats avancées */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)' }}>{bestScore}%</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Meilleur score</div>
              </div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--purple-l)' }}>{formatDuration(totalTime)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Temps total investi</div>
              </div>
            </div>

            {/* Graphique de progression */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, color: 'var(--white)', marginBottom: '.75rem' }}>
                📈 Progression du score
              </h3>
              <ScoreTrendChart results={results} />
            </div>

            {/* Répartition par sujet */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, color: 'var(--white)', marginBottom: '1rem' }}>
                📚 Score moyen par sujet
              </h3>
              <SubjectBreakdownChart results={results} />
            </div>
          </div>
        )
      ) : (
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
      )}
    </div>
  )
}
