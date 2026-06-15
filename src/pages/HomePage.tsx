import type { Page, AppMode } from '../types'

interface Props {
  onNavigate: (page: Page) => void
  onUpgrade: () => void
  appMode?: AppMode
}

const steps = [
  { n: '01', icon: '📄', title: 'Importez votre cours', desc: 'PDF, manuel, notes — n\'importe quel document.' },
  { n: '02', icon: '⚡', title: 'L\'IA génère le quiz', desc: 'L\'IA analyse le contenu et crée des QCM en quelques secondes.' },
  { n: '03', icon: '🎯', title: 'Révisez & progressez', desc: 'Répondez, consultez les explications, suivez vos progrès.' },
]

const features = [
  { icon: '📄', title: 'Import PDF & TXT',          desc: 'Téléchargez un manuel ou vos notes. L\'IA génère des QCM pertinents en quelques secondes.',      tag: 'Gratuit',       tagColor: '#22c55e', tagBg: '#1a3a1a' },
  { icon: '🤖', title: 'Tuteur IA',                 desc: 'Comme ChatGPT, mais spécialisé pour vos cours. 3 modes : débutant, prof strict, examen.',          tag: 'Autodidacte',   tagColor: '#a78bfa', tagBg: '#2d1b69' },
  { icon: '🏘️', title: 'Communautés',               desc: 'Groupes d\'étude par matière. Classements, défis, partage de notes. Rejoignez ou créez.',          tag: 'Autodidacte',   tagColor: '#a78bfa', tagBg: '#2d1b69' },
  { icon: '🏫', title: 'Mode Établissement',         desc: 'Classes, suivi par élève, partage de documents. Espace Discord-like pour chaque classe.',           tag: 'Scolaire',      tagColor: '#60a5fa', tagBg: '#1e3a5f' },
  { icon: '📊', title: 'Suivi des progrès',          desc: 'Historique complet, statistiques, identification des points faibles.',                              tag: 'Gratuit',       tagColor: '#22c55e', tagBg: '#1a3a1a' },
  { icon: '🃏', title: 'Flashcards IA',              desc: 'Révision par cartes mémoire générées automatiquement depuis vos documents.',                        tag: 'Pro',           tagColor: '#f87171', tagBg: '#2a0f0f' },
]

const stats = [
  { value: '10 sec', label: 'Pour générer un quiz' },
  { value: '20 Q',   label: 'Questions max par quiz' },
  { value: '2 langues', label: 'Français & Anglais' },
  { value: 'Gratuit', label: 'Pour commencer' },
]

export function HomePage({ onNavigate, onUpgrade, appMode }: Props) {
  return (
    <div className="fade-in">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div style={{
        textAlign: 'center', padding: 'clamp(3rem,8vw,5rem) 1.5rem 2.5rem',
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(224,60,60,.12) 0%, transparent 70%)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-head)',
          fontSize: 'clamp(2.2rem, 5.5vw, 3.4rem)',
          fontWeight: 900, color: 'var(--white)', lineHeight: 1.1, marginBottom: '1rem',
          letterSpacing: '-0.03em',
        }}>
          Révisez{' '}
          <span style={{
            background: 'linear-gradient(135deg, #e03c3c, #f59e0b)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            10× plus vite
          </span>
          <br />avec l'IA
        </h1>

        <p style={{
          margin: '0 auto 2rem', maxWidth: 500,
          color: 'var(--muted)', lineHeight: 1.75, fontSize: 16,
        }}>
          Importez un PDF — LearnI génère un quiz sur mesure en quelques secondes.
          {appMode === 'school'
            ? ' Gérez vos classes, suivez vos élèves, partagez vos documents.'
            : ' Discutez avec votre tuteur IA, rejoignez des communautés, progressez.'}
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('upload')} style={{
            padding: '14px 36px', borderRadius: 12, fontSize: 15, fontWeight: 700,
            background: 'var(--red)', border: 'none', color: '#fff',
            fontFamily: 'var(--font-body)', cursor: 'pointer',
            boxShadow: '0 0 32px rgba(224,60,60,.35)',
          }}>
            🚀 Commencer gratuitement
          </button>
          <button onClick={onUpgrade} style={{
            padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 500,
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)',
            fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}>
            Voir les plans →
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '2rem',
          marginTop: '2.5rem', flexWrap: 'wrap',
        }}>
          {stats.map(s => (
            <div key={s.value} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--white)' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Comment ça marche ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-head)', fontSize: 'clamp(1.2rem,3vw,1.6rem)',
          fontWeight: 800, color: 'var(--white)', textAlign: 'center', marginBottom: '2rem',
        }}>
          Prêt en 3 étapes
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {steps.map((step, i) => (
            <div key={step.n} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '1.5rem', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 12, right: 14,
                fontFamily: 'var(--font-head)', fontWeight: 900, fontSize: '2.5rem',
                color: 'var(--bg3)', lineHeight: 1,
              }}>{step.n}</div>
              <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>{step.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: '.4rem' }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{step.desc}</p>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', color: 'var(--border2)', fontSize: 20, display: 'none' }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Fonctionnalités ────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '1rem 1.5rem 3rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-head)', fontSize: 'clamp(1.2rem,3vw,1.6rem)',
          fontWeight: 800, color: 'var(--white)', textAlign: 'center', marginBottom: '2rem',
        }}>
          Tout ce dont vous avez besoin pour réviser
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {features.map(f => (
            <div key={f.title}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '1.5rem',
                transition: 'border-color .2s, transform .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                <span style={{ fontSize: '2rem' }}>{f.icon}</span>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                  background: f.tagBg, color: f.tagColor,
                }}>
                  {f.tag}
                </span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--white)' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA final ─────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 680, margin: '0 auto 4rem', padding: '2.5rem 2rem',
        background: 'linear-gradient(135deg, #12101e, #1a1033)',
        border: '1px solid #3d2b6b', borderRadius: 20, textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🎯</div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.5rem' }}>
          Prêt à améliorer vos notes ?
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
          Commencez gratuitement — aucune carte de crédit requise.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('upload')} style={{
            padding: '13px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700,
            background: 'var(--purple)', border: 'none', color: '#fff',
            fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}>
            Générer mon premier quiz
          </button>
          <button onClick={() => onNavigate('pricing')} style={{
            padding: '13px 24px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            background: 'transparent', border: '1px solid #4a3080', color: '#a78bfa',
            fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}>
            Voir les plans
          </button>
        </div>
      </div>
    </div>
  )
}
