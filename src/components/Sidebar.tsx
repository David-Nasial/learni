// ─── Sidebar — LearnI ─────────────────────────────────────────────────────────
import { Home, FileText, BarChart2, Camera, Layers, Bot, DollarSign, GraduationCap, User2, X, RefreshCw, Users, Calendar, BookOpen, Briefcase } from 'lucide-react'
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

export function Sidebar({ open, currentPage, plan, appMode, role, isLoggedIn, onNavigate, onProFeature, onClose, onChangeMode }: Props) {
  const go = (page: Page) => { onNavigate(page); onClose() }

  // Items communs à tous les modes
  const commonItems = [
    { icon: <Home size={17} />,      label: 'Accueil',         page: 'home'    as Page },
    { icon: <FileText size={17} />,  label: 'Générer un quiz', page: 'upload'  as Page },
    { icon: <BarChart2 size={17} />, label: 'Mes résultats',   page: 'history' as Page },
    { icon: <Bot size={17} />,       label: 'Tuteur IA',       page: 'tutor'   as Page },
    { icon: <Calendar size={17} />,   label: 'Plan d\'étude',   page: 'study'   as Page },
    { icon: <BookOpen size={17} />,   label: 'Mes Cours',        page: 'courses' as Page },
    { icon: <Users size={17} />,     label: 'Communautés',     page: 'community'  as Page },
    { icon: <Layers size={17} />,     label: 'Flashcards',      page: 'flashcards' as Page },
    { icon: <Briefcase size={17} />, label: 'Mon Cartable',    page: 'cartable'   as Page },
    { icon: <DollarSign size={17} />,label: 'Tarifs',          page: 'pricing'    as Page },
  ]

  // Items Pro (avec paywall)
  const proItems = [
    { icon: <Camera size={17} />,  label: 'Caméra',         feature: 'camera'  },
    { icon: <Bot size={17} />,     label: 'Explication IA', feature: 'explain' },
  ]

  // Items école — seulement si mode school et connecté
  const schoolItems = appMode === 'school' && isLoggedIn ? [
    role === 'teacher'
      ? { icon: <GraduationCap size={17} />, label: 'Mes classes', page: 'teacher' as Page }
      : { icon: <User2 size={17} />,         label: 'Mon profil',  page: 'student' as Page },
  ] : []

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

        {/* Badge mode actuel */}
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

        {/* Navigation commune */}
        {commonItems.map(item => {
          const isActive = currentPage === item.page
          return (
            <button key={item.label} onClick={() => go(item.page)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8,
              background: isActive ? 'var(--bg3)' : 'transparent',
              border: 'none',
              color: isActive ? 'var(--text)' : 'var(--muted)',
              fontSize: 14, fontFamily: 'var(--font-body)',
              width: '100%', textAlign: 'left',
            }}>
              {item.icon} {item.label}
            </button>
          )
        })}

        {/* Items école */}
        {schoolItems.map(item => {
          const isActive = 'page' in item && currentPage === item.page
          return (
            <button key={item.label} onClick={() => 'page' in item && go(item.page)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8,
              background: isActive ? 'var(--bg3)' : 'transparent',
              border: 'none',
              color: isActive ? 'var(--text)' : 'var(--muted)',
              fontSize: 14, fontFamily: 'var(--font-body)',
              width: '100%', textAlign: 'left',
            }}>
              {item.icon} {item.label}
            </button>
          )
        })}

        {/* Séparateur */}
        <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

        {/* Items Pro */}
        {proItems.map(item => (
          <button key={item.label} onClick={() => { onProFeature(item.feature); onClose() }} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8,
            background: 'transparent', border: 'none',
            color: 'var(--muted)', fontSize: 14,
            fontFamily: 'var(--font-body)', width: '100%', textAlign: 'left',
          }}>
            {item.icon}
            <span style={{ flex: 1 }}>{item.label}</span>
            {plan === 'free' && role !== 'superadmin' && (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#2d1b69', color: '#a78bfa', fontWeight: 600, border: '1px solid #4a3080' }}>PRO</span>
            )}
          </button>
        ))}

        {/* Bloc upgrade */}
        {plan === 'free' && role !== 'superadmin' && (
          <div style={{ marginTop: 'auto', background: 'linear-gradient(135deg,#1a1a2e,#2d1b69)', border: '1px solid #4a3080', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#a78bfa', marginBottom: 4 }}>🔒 Fonctions avancées</p>
            <strong style={{ display: 'block', fontFamily: 'var(--font-head)', fontSize: '.85rem', color: '#c4b5fd', marginBottom: 10 }}>
              Débloquez LearnI Pro
            </strong>
            <button onClick={() => { onProFeature('sub'); onClose() }} style={{ width: '100%', padding: '8px 0', background: 'var(--purple)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
              Upgrade — à partir de 10$/mois
            </button>
          </div>
        )}
      </aside>
    </>
  )
}