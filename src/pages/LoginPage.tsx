// ─── Page Connexion / Inscription ─────────────────────────────────────────────
import { useState } from 'react'
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { signIn, signUp, supabase } from '../utils/supabase'
import type { AppMode } from '../types'

interface Props {
  onSuccess:    () => void
  initialMode?: 'login' | 'signup'
  appMode:      AppMode   // 'personal' | 'school'
}

type Mode = 'login' | 'signup'
type Role = 'student' | 'teacher'

export function LoginPage({ onSuccess, initialMode = 'login', appMode }: Props) {
  const [mode,     setMode]     = useState<Mode>(initialMode)
  const [role,     setRole]     = useState<Role>('student')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [sent,     setSent]     = useState(false)

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (oauthError) setError(oauthError.message)
  }

  // ── Apple OAuth (school seulement) ───────────────────────────────────────────
  const handleApple = async () => {
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    })
    if (oauthError) setError(oauthError.message)
  }

  // ── Email / mot de passe ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('Email et mot de passe requis.'); return }
    if (password.length < 6)  { setError('Mot de passe : 6 caractères minimum.'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        onSuccess()
      } else {
        // En mode personnel, on crée toujours avec rôle 'student'
        const effectiveRole: Role = appMode === 'school' ? role : 'student'
        await signUp(email, password, effectiveRole)
        setSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // ── Écran confirmation email ──────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="fade-in" style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
        <h2 style={{ ...headStyle, marginBottom: '.5rem' }}>Confirmez votre email</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          Un lien a été envoyé à <strong style={{ color: 'var(--white)' }}>{email}</strong>.
          Cliquez dessus pour activer votre compte.
        </p>
        <button onClick={() => { setSent(false); setMode('login') }} style={{ ...btnRed, marginTop: '1.5rem', width: '100%' }}>
          Revenir à la connexion
        </button>
      </div>
    )
  }

  return (
    <div className="fade-in" style={cardStyle}>

      {/* Badge mode */}
      <div style={{
        display: 'inline-block', marginBottom: '1.25rem',
        padding: '4px 12px', borderRadius: 20, fontSize: 12,
        background: appMode === 'school' ? '#1a1033' : 'var(--bg3)',
        border: `1px solid ${appMode === 'school' ? '#4a3080' : 'var(--border)'}`,
        color: appMode === 'school' ? '#a78bfa' : 'var(--muted)',
      }}>
        {appMode === 'school' ? '🏫 Mode Établissement scolaire' : '🎓 Mode Personnel'}
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', marginBottom: '1.75rem', background: 'var(--bg3)', borderRadius: 8, padding: 3 }}>
        {(['login', 'signup'] as Mode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); setError('') }} style={{
            flex: 1, padding: '9px 0',
            background: mode === m ? 'var(--bg2)' : 'transparent',
            border: 'none', borderRadius: 6,
            color: mode === m ? 'var(--white)' : 'var(--muted)',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: mode === m ? 600 : 400,
            cursor: 'pointer',
          }}>
            {m === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        ))}
      </div>

      {/* Boutons OAuth */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1.25rem' }}>
        {/* Google et Apple — disponible seulement pour personnal */}
        {appMode === 'personal' && (
        <button onClick={handleGoogle} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: '11px 0',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 9, color: 'var(--text)',
          fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continuer avec Google
        </button>
        )}
        {appMode === 'personal' && (
          <button onClick={handleApple} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '11px 0',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 9, color: 'var(--text)',
            fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}>
            <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor">
              <path d="M13.544 9.33c-.02-2.21 1.807-3.275 1.889-3.328-1.031-1.507-2.632-1.713-3.197-1.732-1.358-.138-2.662.8-3.354.8-.69 0-1.754-.782-2.888-.76-1.484.022-2.857.864-3.617 2.19-1.548 2.683-.396 6.655 1.11 8.832.738 1.066 1.617 2.261 2.768 2.218 1.114-.045 1.534-.714 2.882-.714 1.347 0 1.73.714 2.906.69 1.196-.02 1.95-1.082 2.682-2.152.851-1.23 1.2-2.427 1.217-2.488-.027-.012-2.33-.895-2.352-3.556z"/>
              <path d="M11.355 2.89C11.95 2.167 12.35 1.17 12.233 0c-.851.035-1.887.567-2.498 1.284-.546.633-1.027 1.655-.896 2.63.949.073 1.916-.48 2.516-1.024z"/>
            </svg>
            Continuer avec Apple
          </button>
          )}
      </div>

      {/* Séparateur */}
      {appMode === 'personal' && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>ou par email</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      )}

      {/* Choix rôle — SEULEMENT mode school + inscription */}
      {mode === 'signup' && appMode === 'school' && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Je suis…</label>
          <div style={{ display: 'flex', gap: '.75rem', marginTop: 6 }}>
            {(['student', 'teacher'] as Role[]).map(r => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: '10px 0',
                background: role === r ? '#1a1520' : 'var(--bg3)',
                border: `1px solid ${role === r ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 8,
                color: role === r ? 'var(--white)' : 'var(--muted)',
                fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer',
              }}>
                {r === 'student' ? '🎓 Étudiant' : '👩‍🏫 Enseignant'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nom (inscription seulement) */}
      {mode === 'signup' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Nom complet</label>
          <div style={inputWrap}>
            <User size={16} color="var(--muted)" />
            <input type="text" placeholder="Jean Tremblay"
              value={name} onChange={e => setName(e.target.value)}
              style={inputStyle} />
          </div>
        </div>
      )}

      {/* Email */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Adresse email</label>
        <div style={inputWrap}>
          <Mail size={16} color="var(--muted)" />
          <input type="email" placeholder="vous@example.com"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={inputStyle} />
        </div>
      </div>

      {/* Mot de passe */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>Mot de passe</label>
        <div style={inputWrap}>
          <Lock size={16} color="var(--muted)" />
          <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={inputStyle} />
          <button onClick={() => setShowPw(!showPw)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '1rem', padding: '10px 14px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Bouton principal */}
      <button onClick={handleSubmit} disabled={loading} style={{ ...btnRed, width: '100%', opacity: loading ? .6 : 1 }}>
        {loading ? '⏳ Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: '1.25rem' }}>
        {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
          style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
          {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
        </button>
      </p>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  maxWidth: 440, margin: '2rem auto', padding: '2.5rem 2rem',
  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18,
}
const headStyle: React.CSSProperties = {
  fontFamily: 'var(--font-head)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--white)',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px',
}
const inputWrap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '0 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
}
const inputStyle: React.CSSProperties = {
  flex: 1, padding: '11px 0', background: 'transparent',
  border: 'none', outline: 'none', color: 'var(--text)',
  fontFamily: 'var(--font-body)', fontSize: 14,
}
const btnRed: React.CSSProperties = {
  padding: '13px 0', background: 'var(--red)', border: 'none',
  borderRadius: 10, color: '#fff',
  fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
}