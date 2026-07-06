// ─── Sidebar — LearnI ─────────────────────────────────────────────────────────
import { Home, FileText, BarChart2, Layers, Bot, DollarSign,
         GraduationCap, User2, X, RefreshCw, Users, Calendar,
         BookOpen, Briefcase, Lock } from 'lucide-react'
import type { Page, Plan, AppMode } from '../types'

interface Props {
  open:          boolean
  currentPage:   Page
  plan:          Plan
  appMode:       AppMode
  role:          'student' | 'teacher' | 'superadmin'
  isLoggedIn:    boolean
  onNavigate:    (page: Page) => void
  onProFeature:  (feature: string) => void
  onClose:       () => void
  onChangeMode:  () => void
}

// ─── Définition des accès par plan ───────────────────────────────────────────
// 'show'   = visible et accessible
// 'paywall'= visible mais paywall au clic (plan gratuit)
// 'hidden' = caché (plan inférieur mais on ne le montre pas)

type Access = 'show' | 'paywall' | 'hidden'

interface NavItem {
  icon:    React.ReactNode
  label:   string
  page:    Page
  badge?:  string // ex: "PRO", "AUTODIDACTE"
  access:  (plan: Plan, role: string, appMode: AppMode) => Access
}

const NAV_ITEMS: NavItem[] = [
  {
    icon: <Home size={17} />, label: 'Accueil', page: 'home',
    access: () => 'show',
  },
  {
    icon: <FileText size={17} />, label: 'Générer un quiz', page: 'upload',
    access: () => 'show',
  },
  {
    icon: <BarChart2 size={17} />, label: 'Mes résultats', page: 'history',
    access: () => 'show',
  },
  {
    icon: <Layers size={17} />, label: 'Flashcards', page: 'flashcards',
    badge: 'STARTER',
    access: (plan, role) => {
      if (role === 'superadmin') return 'show'
      if (['starter', 'pro', 'autodidacte', 'teacher'].includes(plan)) return 'show'
      return 'paywall' // gratuit : visible mais paywall
    },
  },
  {
    icon: <Calendar size={17} />, label: "Plan d'étude", page: 'study',
    badge: 'PRO',
    access: (plan, role) => {
      if (role === 'superadmin') return 'show'
      if (['pro', 'autodidacte', 'teacher'].includes(plan)) return 'show'
      if (plan === 'free') return 'paywall'
      return 'hidden' // starter : caché
    },
  },
  {
    icon: <BookOpen size={17} />, label: 'Mes Cours', page: 'courses',
    badge: 'AUTODIDACTE',
    access: (plan, role) => {
      if (role === 'superadmin') return 'show'
      if (plan === 'autodidacte') return 'show'
      if (plan === 'free') return 'paywall'
      return 'hidden' // starter, pro, teacher : caché
    },
  },
  {
    icon: <Bot size={17} />, label: 'Tuteur IA', page: 'tutor',
    badge: 'AUTODIDACTE',
    access: (plan, role) => {
      if (role === 'superadmin') return 'show'
      if (plan === 'autodidacte') return 'show'
      if (plan === 'free') return 'paywall'
      return 'hidden'
    },
  },
  {
    icon: <Users size={17} />, label: 'Communautés', page: 'community',
    badge: 'AUTODIDACTE',
    access: (plan, role, appMode) => {
      if (role === 'superadmin') return 'show'
      if (plan === 'autodidacte' || appMode === 'school') return 'show'
      if (plan === 'free') return 'paywall'
      return 'hidden'
    },
  },
  {
    icon: <Briefcase size={17} />, label: 'Mon Cartable', page: 'cartable',
    badge: 'PRO',
    access: (plan, role) => {
      if (role === 'superadmin') return 'show'
      if (['pro', 'autodidacte', 'teacher'].includes(plan)) return 'show'
      if (plan === 'free') return 'paywall'
      return 'hidden'
    },
  },
  {
    icon: <DollarSign size={17} />, label: 'Tarifs', page: 'pricing',
    access: () => 'show',
  },
]

const BADGE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  STARTER:     { color: '#f5a623', bg: '#2a1f00', border: '#4a3500' },
  PRO:         { color: '#f87171', bg: '#2a0f0f', border: '#4a1515' },
  AUTODIDACTE: { color: '#a78bfa', bg: '#2d1b69', border: '#4a3080' },
}

export function Sidebar({ open, currentPage, plan, appMode, role, isLoggedIn,
  onNavigate, onProFeature, onClose, onChangeMode }: Props) {

  const go = (page: Page) => { onNavigate(page); onClose() }

  const isSuperadmin = role === 'superadmin'
  const isTeacher    = role === 'teacher'

  // Items école
  const schoolItem = appMode === 'school' && isLoggedIn
    ? (isTeacher || isSuperadmin
        ? { icon: <GraduationCap size={17} />, label: 'Mes classes', page: 'teacher' as Page }
        : { icon: <User2 size={17} />,         label: 'Mon profil',  page: 'student' as Page })
    : null

  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 85 }} />
      )}
      <aside style={{
        position: 'fixed', left: 0, top: 64, bottom: 0, width: 260,
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        padding: '1rem .75rem',
        display: 'flex', flexDirection: 'column', gap: 3,
        zIndex: 90,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        overflowY: 'auto',
      }}>
        <button onClick={onClose} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--muted)', marginBottom: 6, padding: 4 }}>
          <X size={18} />
        </button>

        {/* Badge mode */}
        <div style={{
          padding: '7px 12px', borderRadius: 8, marginBottom: 8,
          background: appMode === 'school' ? '#1a1033' : 'var(--bg3)',
          border: `1px solid ${appMode === 'school' ? '#4a3080' : 'var(--border)'}`,
          fontSize: 12, color: appMode === 'school' ? '#a78bfa' : 'var(--muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{appMode === 'school' ? '🏫 Mode Établissement' : '🎓 Mode Personnel'}</span>
          <button onClick={onChangeMode} title="Changer" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}>
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Navigation */}
        {NAV_ITEMS.map(item => {
          const access = isSuperadmin ? 'show' : item.access(plan, role, appMode)
          if (access === 'hidden') return null

          const isActive  = currentPage === item.page
          const isLocked  = access === 'paywall'
          const badgeInfo = item.badge ? BADGE_COLORS[item.badge] : null

          return (
            <button
              key={item.label}
              onClick={() => {
                if (isLocked) { onProFeature('sub'); onClose() }
                else go(item.page)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                background: isActive ? 'var(--bg3)' : 'transparent',
                border: 'none',
                color: isLocked ? '#555' : isActive ? 'var(--text)' : 'var(--muted)',
                fontSize: 14, fontFamily: 'var(--font-body)',
                width: '100%', textAlign: 'left', cursor: 'pointer',
                opacity: isLocked ? 0.7 : 1,
              }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {isLocked && <Lock size={12} style={{ color: '#555', flexShrink: 0 }} />}
              {!isLocked && badgeInfo && !isSuperadmin && plan === 'free' && (
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 20, fontWeight: 700,
                  background: badgeInfo.bg, color: badgeInfo.color, border: `1px solid ${badgeInfo.border}`,
                  flexShrink: 0,
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}

        {/* Item école */}
        {schoolItem && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <button onClick={() => go(schoolItem.page)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8,
              background: currentPage === schoolItem.page ? 'var(--bg3)' : 'transparent',
              border: 'none',
              color: currentPage === schoolItem.page ? 'var(--text)' : 'var(--muted)',
              fontSize: 14, fontFamily: 'var(--font-body)', width: '100%', textAlign: 'left', cursor: 'pointer',
            }}>
              {schoolItem.icon} {schoolItem.label}
            </button>
          </>
        )}

        {/* Bloc upgrade pour gratuit */}
        {plan === 'free' && !isSuperadmin && (
          <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#2d1b69)', border: '1px solid #4a3080', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#a78bfa', marginBottom: 4 }}>🔒 Fonctions avancées</p>
              <strong style={{ display: 'block', fontFamily: 'var(--font-head)', fontSize: '.85rem', color: '#c4b5fd', marginBottom: 10 }}>
                Débloquez LearnI
              </strong>
              <button onClick={() => { onProFeature('sub'); onClose() }} style={{
                width: '100%', padding: '8px 0', background: 'var(--purple)',
                border: 'none', borderRadius: 8, color: '#fff',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
              }}>
                Voir les plans →
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
