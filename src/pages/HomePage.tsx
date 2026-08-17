import { useEffect, useRef, useState } from 'react'
import { FileText, Zap, TrendingUp, Bot, Users, School, BarChart2, Layers, Calendar, GraduationCap, Lightbulb, BadgeCheck } from 'lucide-react'
import type { Page, AppMode, Plan } from '../types'
import type { Profile } from '../utils/supabase'
import type { User } from '@supabase/supabase-js'

interface Props {
  onNavigate: (page: Page) => void
  onUpgrade:  () => void
  appMode?:   AppMode
  user?:      User | null
  profile?:   Profile | null
  plan?:      Plan
  onToggleAutodidacteOverride?: () => void
  onSetSuperadminTestPlan?: (plan: Plan | null) => void
  /** Nombre de quiz déjà complétés — 0 déclenche l'accueil « premier jour ». */
  resultsCount?: number
}

// ─── Apparition au défilement ─────────────────────────────────────────────────
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(22px)',
      transition: `opacity .6s ease ${delay}ms, transform .6s cubic-bezier(.2,.7,.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

const steps = [
  { n: '01', icon: FileText,   title: 'Importez votre cours', desc: 'PDF, manuel, notes — n\'importe quel document.' },
  { n: '02', icon: Zap,        title: 'L\'IA génère le quiz', desc: 'L\'IA analyse le contenu et crée des QCM en quelques secondes.' },
  { n: '03', icon: TrendingUp, title: 'Révisez & progressez', desc: 'Répondez, consultez les explications, suivez vos progrès.' },
]

const features = [
  { icon: FileText, title: 'Import PDF & TXT',     desc: 'Téléchargez un manuel ou vos notes. L\'IA génère des QCM pertinents en quelques secondes.', tag: 'Gratuit',     tagColor: '#22c55e', tagBg: '#1a3a1a' },
  { icon: Bot,       title: 'Tuteur IA',            desc: 'Comme ChatGPT, mais spécialisé pour vos cours. 3 modes : débutant, prof strict, examen.',    tag: 'Autodidacte', tagColor: '#a78bfa', tagBg: '#2d1b69' },
  { icon: Users,     title: 'Communautés',          desc: 'Groupes d\'étude par matière. Classements, défis, partage de notes.',                        tag: 'Autodidacte', tagColor: '#a78bfa', tagBg: '#2d1b69' },
  { icon: School,    title: 'Mode Établissement',    desc: 'Classes, suivi par élève, partage de documents. Espace Discord-like pour chaque classe.',     tag: 'Scolaire',    tagColor: '#60a5fa', tagBg: '#1e3a5f' },
  { icon: BarChart2, title: 'Suivi des progrès',     desc: 'Historique complet, statistiques, identification des points faibles.',                        tag: 'Gratuit',     tagColor: '#22c55e', tagBg: '#1a3a1a' },
  { icon: Layers,    title: 'Flashcards IA',         desc: 'Révision par cartes mémoire générées automatiquement depuis vos documents.',                  tag: 'Pro',         tagColor: '#f87171', tagBg: '#2a0f0f' },
]

const stats = [
  { value: '10 sec',    label: 'Pour générer un quiz' },
  { value: '20 Q',      label: 'Questions max par quiz' },
  { value: '2 langues', label: 'Français & Anglais' },
  { value: 'Gratuit',   label: 'Pour commencer' },
]

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  free:        { label: 'Gratuit',          color: '#22c55e', bg: '#1a3a1a' },
  starter:     { label: 'Starter',          color: '#f5a623', bg: '#2a1f00' },
  pro:         { label: 'Pro',              color: '#f87171', bg: '#2a0f0f' },
  autodidacte: { label: 'Autodidacte',      color: '#a78bfa', bg: '#2d1b69' },
  teacher:     { label: 'Enseignant',       color: '#60a5fa', bg: '#1e3a5f' },
}

// ─── Dashboard utilisateur connecté ──────────────────────────────────────────
function DashboardHome({ onNavigate, onUpgrade, profile, plan, appMode, onToggleAutodidacteOverride, onSetSuperadminTestPlan, resultsCount }: Props) {
  // `plan` est le plan EFFECTIF (peut être 'pro' si la bascule est active) ;
  // `billedPlan` est le plan réellement payé — c'est lui qu'on affiche en badge principal.
  const billedPlan = profile?.billed_plan ?? plan
  const autodidacteOverrideActive = profile?.plan_override === 'pro'
  const planInfo = PLAN_LABELS[billedPlan ?? 'free'] ?? PLAN_LABELS.free
  const firstName = profile?.name?.split(' ')[0] ?? profile?.email?.split('@')[0] ?? 'toi'
  const isAutodidacte = plan === 'autodidacte'
  const isPro = plan === 'pro' || plan === 'autodidacte'
  const isTeacher = profile?.role === 'teacher' || plan === 'teacher'
  const isSuperadmin = profile?.role === 'superadmin'
  const isSchool = appMode === 'school'

  // Outil de test Super Admin : `trueSuperadmin` reste vrai même pendant un test de plan
  // (où `profile.role` est temporairement ramené à 'student'), pour garder l'outil accessible.
  // On lit `profile.plan` directement (pas le prop `plan`) pour rester cohérent avec
  // `true_role` dans le même rendu, sans dépendre du useEffect de synchronisation d'App.tsx.
  const trueSuperadmin = profile?.role === 'superadmin' || profile?.true_role === 'superadmin'
  const testPlanActive = profile?.true_role === 'superadmin' ? profile?.plan : undefined

  // Premier jour : aucun quiz complété — on accueille au lieu de dire « bon retour ».
  const isNewUser = (resultsCount ?? 0) === 0
  const studyGoal = profile?.study_goal?.trim()

  const quickActions = [
    {
      icon: FileText, label: 'Générer un quiz', desc: 'Importer un document et créer un quiz instantanément', page: 'upload' as Page,
      color: 'var(--red)', always: true,
    },
    {
      icon: BarChart2, label: 'Mon historique', desc: 'Voir mes résultats et ma progression', page: 'history' as Page,
      color: '#3b82f6', always: true,
    },
    {
      icon: Bot, label: 'Tuteur IA', desc: 'Poser une question à mon tuteur personnel', page: 'tutor' as Page,
      color: '#a78bfa', always: false, show: isAutodidacte || isSuperadmin,
    },
    {
      icon: Calendar, label: 'Plan d\'étude', desc: 'Mon calendrier de révision intelligent', page: 'study' as Page,
      color: '#10b981', always: false, show: isPro || isSchool || isSuperadmin,
    },
    {
      icon: GraduationCap, label: 'Mes Cours', desc: 'Cours générés par l\'IA sur mes sujets', page: 'courses' as Page,
      color: '#8b5cf6', always: false, show: isAutodidacte || isSuperadmin,
    },
    {
      icon: Users, label: 'Communautés', desc: 'Rejoindre des groupes d\'étude', page: 'community' as Page,
      color: '#f59e0b', always: false, show: isAutodidacte || isSchool || isSuperadmin,
    },
    {
      icon: Layers, label: 'Flashcards', desc: 'Cartes recto/verso générées par l\'IA', page: 'flashcards' as Page,
      color: '#a78bfa', always: false, show: isPro || isAutodidacte || isSuperadmin,
    },
    {
      icon: School, label: 'Ma classe', desc: 'Tableau de bord enseignant', page: 'teacher' as Page,
      color: '#60a5fa', always: false, show: isTeacher || isSuperadmin,
    },
  ].filter(a => a.always || a.show)

  return (
    <div className="fade-in" style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* ── Bannière de bienvenue ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #12101e 0%, #1a1033 50%, #0f1f2e 100%)',
        border: '1px solid #3d2b6b',
        borderRadius: 20, padding: '2rem 2.5rem', marginBottom: '2rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Fond décoratif */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(167,139,250,.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: '40%', width: 150, height: 150,
          borderRadius: '50%', background: 'rgba(224,60,60,.05)', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {isNewUser ? 'Bienvenue' : 'Bon retour'}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-head)', fontSize: 'clamp(1.4rem,3vw,2rem)',
              fontWeight: 800, color: 'var(--white)', marginBottom: '.4rem', lineHeight: 1.2,
            }}>
              Bonjour, <span style={{ background: 'linear-gradient(135deg, #a78bfa, #e03c3c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{firstName}</span> !
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              {isNewUser
                ? studyGoal
                  ? <>Ton premier quiz sur <strong style={{ color: 'var(--text)' }}>{studyGoal}</strong> t'attend.</>
                  : 'Commence par importer un document — ton premier quiz prend 10 secondes.'
                : 'Prêt à apprendre quelque chose aujourd\'hui ?'}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Ton plan
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
              background: planInfo.bg, color: planInfo.color, border: `1.5px solid ${planInfo.color}`,
            }}>
              <BadgeCheck size={15} />
              {planInfo.label}
            </span>

            {autodidacteOverrideActive && (
              <>
                <div style={{ width: 0, height: 10, borderLeft: '1.5px dashed var(--muted)' }} />
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                  background: PLAN_LABELS.starter.bg, color: PLAN_LABELS.starter.color, border: `1.5px solid ${PLAN_LABELS.starter.color}`,
                }}>
                  <BadgeCheck size={15} />
                  {PLAN_LABELS.pro.label}
                </span>
              </>
            )}

            {plan === 'free' && (
              <button onClick={onUpgrade} style={{
                padding: '6px 14px', background: 'var(--purple)', border: 'none',
                borderRadius: 20, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                Passer à Pro →
              </button>
            )}

            {billedPlan === 'autodidacte' && (
              <button
                onClick={onToggleAutodidacteOverride}
                title={autodidacteOverrideActive
                  ? 'Retrouve le Tuteur IA, Mes Cours et les Communautés'
                  : "Accède temporairement à Mon Cartable, inclus dans ton abonnement Autodidacte"}
                style={{
                  padding: '6px 14px',
                  background: autodidacteOverrideActive ? 'transparent' : 'var(--purple)',
                  border: autodidacteOverrideActive ? '1px solid #4a3080' : 'none',
                  borderRadius: 20, color: autodidacteOverrideActive ? '#a78bfa' : '#fff',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {autodidacteOverrideActive ? '← Revenir Autodidacte' : 'Passer à Pro →'}
              </button>
            )}
          </div>
        </div>

        {/* Barre d'action rapide */}
        <div style={{ marginTop: '1.5rem' }}>
          <button onClick={() => onNavigate('upload')} style={{
            padding: '12px 28px', background: 'var(--red)', border: 'none',
            borderRadius: 10, color: '#fff', fontFamily: 'var(--font-head)',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 0 24px rgba(224,60,60,.3)',
          }}>
            Générer un quiz maintenant
          </button>
        </div>
      </div>

      {/* ── Outil de test Super Admin : voir l'app comme n'importe quel plan ── */}
      {trueSuperadmin && (
        <div style={{
          background: 'linear-gradient(135deg, #1a1033, #0f1f2e)',
          border: '1px solid #3d2b6b', borderRadius: 16, padding: '1.25rem 1.5rem', marginBottom: '2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem', marginBottom: '.9rem' }}>
            <div>
              <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                🛠️ Outil de test — Super Admin
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                {testPlanActive
                  ? <>Tu vois actuellement l'app comme un compte <strong style={{ color: PLAN_LABELS[testPlanActive].color }}>{PLAN_LABELS[testPlanActive].label}</strong> — accès, badges et paywalls réagissent comme pour ce plan.</>
                  : "Choisis un plan pour voir l'app exactement comme un utilisateur de ce plan la verrait, sans payer."}
              </p>
            </div>
            {testPlanActive && (
              <button onClick={() => onSetSuperadminTestPlan?.(null)} style={{
                padding: '7px 14px', background: 'transparent', border: '1px solid #4a3080',
                borderRadius: 20, color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                ← Revenir à Super Admin
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['free', 'starter', 'pro', 'autodidacte', 'teacher'] as const).map(p => {
              const info = PLAN_LABELS[p]
              const active = testPlanActive === p
              return (
                <button
                  key={p}
                  onClick={() => onSetSuperadminTestPlan?.(active ? null : p)}
                  style={{
                    padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    background: active ? info.color : 'transparent',
                    color: active ? '#100c1c' : info.color,
                    border: `1.5px solid ${info.color}`,
                  }}
                >
                  {active ? `✓ ${info.label}` : `Passer à ${info.label}`}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Actions rapides ───────────────────────────────────────────── */}
      <h2 style={{
        fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em',
        marginBottom: '1rem',
      }}>
        Accès rapide
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem', marginBottom: '2.5rem',
      }}>
        {quickActions.map(action => (
          <button key={action.label} onClick={() => onNavigate(action.page)} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '1.25rem', textAlign: 'left', cursor: 'pointer',
            transition: 'border-color .2s, transform .2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
          >
            <action.icon size={26} color={action.color} style={{ marginBottom: '.6rem' }} />
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '.95rem', marginBottom: '.3rem' }}>
              {action.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              {action.desc}
            </div>
          </button>
        ))}
      </div>

      {/* ── Conseil du jour ───────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2318, #0d1f14)',
        border: '1px solid #1a4a3a', borderRadius: 14, padding: '1.25rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <Lightbulb size={28} color="#6ee7b7" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: '#6ee7b7', fontSize: 13, marginBottom: 4 }}>
            Conseil LearnI
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            {isAutodidacte
              ? 'Essaie le Tuteur IA en mode "Examen" pour simuler une vraie interrogation et identifier tes points faibles avant l\'épreuve.'
              : isPro
              ? 'Utilise le calendrier d\'étude pour planifier tes révisions — des sessions courtes et régulières sont plus efficaces qu\'une longue session de bourrage.'
              : 'Révise en plusieurs petites sessions plutôt qu\'en une seule grande — ton cerveau retient mieux avec la répétition espacée.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page d'accueil visiteur ──────────────────────────────────────────────────
export function HomePage({ onNavigate, onUpgrade, appMode, user, profile, plan, onToggleAutodidacteOverride, onSetSuperadminTestPlan, resultsCount }: Props) {

  // Utilisateur connecté avec un plan → dashboard personnalisé
  if (user && plan && plan !== 'free') {
    return <DashboardHome onNavigate={onNavigate} onUpgrade={onUpgrade} appMode={appMode} user={user} profile={profile} plan={plan} onToggleAutodidacteOverride={onToggleAutodidacteOverride} onSetSuperadminTestPlan={onSetSuperadminTestPlan} resultsCount={resultsCount} />
  }

  // Utilisateur connecté gratuit → dashboard simplifié
  if (user) {
    return <DashboardHome onNavigate={onNavigate} onUpgrade={onUpgrade} appMode={appMode} user={user} profile={profile} plan={plan ?? 'free'} onToggleAutodidacteOverride={onToggleAutodidacteOverride} onSetSuperadminTestPlan={onSetSuperadminTestPlan} resultsCount={resultsCount} />
  }

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
          animation: 'heroUp .7s cubic-bezier(.2,.7,.3,1) both',
        }}>
          Révisez{' '}
          <span style={{
            background: 'linear-gradient(120deg, #e03c3c, #f59e0b, #e03c3c)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'gradientShift 5s ease-in-out infinite',
          }}>
            10× plus vite
          </span>
          <br />avec l'IA
        </h1>

        <p style={{
          margin: '0 auto 2rem', maxWidth: 500,
          color: 'var(--muted)', lineHeight: 1.75, fontSize: 16,
          animation: 'heroUp .7s cubic-bezier(.2,.7,.3,1) 100ms both',
        }}>
          Importez un PDF — LearnI génère un quiz sur mesure en quelques secondes.
          {appMode === 'school'
            ? ' Gérez vos classes, suivez vos élèves, partagez vos documents.'
            : ' Discutez avec votre tuteur IA, rejoignez des communautés, progressez.'}
        </p>

        <div style={{
          display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap',
          animation: 'heroUp .7s cubic-bezier(.2,.7,.3,1) 200ms both',
        }}>
          <button onClick={() => onNavigate('upload')} style={{
            padding: '14px 36px', borderRadius: 12, fontSize: 15, fontWeight: 700,
            background: 'var(--red)', border: 'none', color: '#fff',
            fontFamily: 'var(--font-body)', cursor: 'pointer',
            boxShadow: '0 0 32px rgba(224,60,60,.35)',
            transition: 'transform .2s, box-shadow .2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 40px rgba(224,60,60,.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 32px rgba(224,60,60,.35)' }}
          >
            Commencer gratuitement
          </button>
          <button onClick={onUpgrade} style={{
            padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 500,
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)',
            fontFamily: 'var(--font-body)', cursor: 'pointer',
            transition: 'border-color .2s, transform .2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
          >
            Voir les plans →
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '2rem',
          marginTop: '2.5rem', flexWrap: 'wrap',
          animation: 'heroUp .7s cubic-bezier(.2,.7,.3,1) 300ms both',
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
        <Reveal>
          <h2 style={{
            fontFamily: 'var(--font-head)', fontSize: 'clamp(1.2rem,3vw,1.6rem)',
            fontWeight: 800, color: 'var(--white)', textAlign: 'center', marginBottom: '2rem',
          }}>
            Prêt en 3 étapes
          </h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 120}>
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '1.5rem', position: 'relative', overflow: 'hidden',
                transition: 'border-color .2s, transform .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{
                  position: 'absolute', top: 12, right: 14,
                  fontFamily: 'var(--font-head)', fontWeight: 900, fontSize: '2.5rem',
                  color: 'var(--bg3)', lineHeight: 1,
                }}>{step.n}</div>
                <step.icon size={28} color="var(--red)" style={{ marginBottom: '.75rem' }} />
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: '.4rem' }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── Fonctionnalités ────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '1rem 1.5rem 3rem' }}>
        <Reveal>
          <h2 style={{
            fontFamily: 'var(--font-head)', fontSize: 'clamp(1.2rem,3vw,1.6rem)',
            fontWeight: 800, color: 'var(--white)', textAlign: 'center', marginBottom: '2rem',
          }}>
            Tout ce dont vous avez besoin pour réviser
          </h2>
        </Reveal>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <div
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '1.5rem',
                  transition: 'border-color .2s, transform .2s, box-shadow .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.25)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                  <f.icon size={26} color="var(--muted)" />
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
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── CTA final ─────────────────────────────────────────────────── */}
      <Reveal>
        <div style={{
          maxWidth: 680, margin: '0 auto 4rem', padding: '2.5rem 2rem',
          background: 'linear-gradient(135deg, #12101e, #1a1033)',
          border: '1px solid #3d2b6b', borderRadius: 20, textAlign: 'center',
        }}>
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
              transition: 'transform .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
            >
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
      </Reveal>
    </div>
  )
}
