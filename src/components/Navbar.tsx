
// ─── Navbar v2 avec Auth ──────────────────────────────────────────────────────
import { Menu, LogOut, User } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Plan } from '../types'

interface Props {
  onMenuClick:    () => void
  plan:           Plan
  user:           SupabaseUser | null
  onUpgradeClick: () => void
  onLoginClick:   () => void
  onLogoutClick:  () => void
  onProfileClick: () => void
}

export function Navbar({ onMenuClick, plan, user, onUpgradeClick, onLoginClick, onLogoutClick, onProfileClick }: Props) {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', height: 64,
      background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onMenuClick} style={{ background: 'none', border: 'none', color: 'var(--text)', padding: 6, borderRadius: 6, display: 'flex' }}>
          <Menu size={22} />
        </button>
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--white)', letterSpacing: '-0.02em' }}>LearnI</span>
      </div>

      <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
        {user ? (
          <>
            {plan === 'free' && (
              <button onClick={onUpgradeClick} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--red)', border: 'none', color: '#fff', fontFamily: 'var(--font-body)' }}>
                ✨ Passer Pro
              </button>
            )}
            {plan === 'pro' && (
              <div style={{ padding: '5px 12px', borderRadius: 20, background: '#2d1b69', border: '1px solid #4a3080', color: '#a78bfa', fontSize: 12, fontWeight: 600 }}>
                ✨ Pro
              </div>
            )}
            <button onClick={onProfileClick} title="Mon profil" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'var(--font-body)' }}>
              <User size={15} />
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email?.split('@')[0]}
              </span>
            </button>
            <button onClick={onLogoutClick} title="Se déconnecter" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
              <LogOut size={15} />
            </button>
          </>
        ) : (
          <>
            <button onClick={onLoginClick} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
              Se connecter
            </button>
            <button onClick={onUpgradeClick} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--red)', border: 'none', color: '#fff', fontFamily: 'var(--font-body)' }}>
              Pro — 24$/mois
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
