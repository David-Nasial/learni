// ─── Paywall Modal ────────────────────────────────────────────────────────────
import { useState } from 'react'
import { X, Loader } from 'lucide-react'
import { startCheckout, type StripePlan } from '../utils/stripe'

interface PaywallConfig {
  icon: string
  title: string
  desc: string
  features: string[]
}

const configs: Record<string, PaywallConfig> = {
  sub: {
    icon: '🚀', title: 'LearnI Pro',
    desc: 'Débloquez toutes les fonctions avancées pour réviser plus efficacement et obtenir de meilleurs résultats.',
    features: [
      '📷 Caméra — photographiez vos notes',
      '🃏 Flashcards générées par IA',
      '🤖 Explications IA après chaque erreur',
      '📤 Export de quiz en PDF',
      '📊 Statistiques et graphiques avancés',
      '🔄 Quiz illimités (gratuit : 3/jour)',
      '⚡ Génération prioritaire',
    ],
  },
  camera: {
    icon: '📷', title: 'Caméra intelligente',
    desc: 'Prenez une photo de vos notes manuscrites, tableaux ou pages de livre.',
    features: ['Reconnaissance de texte manuscrit', 'Lecture de tableaux et schémas', 'Quiz généré en moins de 10 sec'],
  },
  flashcard: {
    icon: '🃏', title: 'Flashcards IA',
    desc: 'Révisez avec des cartes mémoire créées automatiquement depuis vos PDF.',
    features: ['Recto/verso intelligent', 'Répétition espacée', 'Suivi de mémorisation'],
  },
  explain: {
    icon: '🤖', title: 'Explication IA',
    desc: 'Chaque mauvaise réponse déclenche une explication personnalisée.',
    features: ['Explication claire en langage simple', 'Exemples concrets', 'Disponible en FR et EN'],
  },
  export: {
    icon: '📤', title: 'Exporter en PDF',
    desc: 'Téléchargez vos quiz en PDF pour les imprimer ou les partager.',
    features: ['Format d\'impression professionnel', 'Quiz avec ou sans réponses', 'Téléchargement illimité'],
  },
  limit: {
    icon: '⏳', title: 'Limite atteinte',
    desc: 'Vous avez utilisé vos 3 quiz gratuits aujourd\'hui. Passez à Pro pour des quiz illimités.',
    features: ['Quiz illimités chaque jour', 'Toutes les fonctions Pro', 'Annulez à tout moment'],
  },
}

interface Props {
  feature: string | null
  onClose: () => void
  isLoggedIn: boolean
  onLogin: () => void
}

// Map feature/plan name to Stripe plan ID
const featureToStripePlan: Record<string, StripePlan> = {
  sub: 'pro', camera: 'pro', flashcard: 'pro', explain: 'pro',
  export: 'pro', limit: 'pro', teacher: 'teacher',
}

export function Paywall({ feature, onClose, isLoggedIn, onLogin }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubscribe = async () => {
    if (!isLoggedIn) { onClose(); onLogin(); return }
    setError('')
    setLoading(true)
    try {
      const stripePlan = featureToStripePlan[feature ?? 'sub'] ?? 'pro'
      await startCheckout(stripePlan)
      // startCheckout redirects to Stripe — code below only runs on error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de paiement')
      setLoading(false)
    }
  }
  if (!feature) return null
  const c = configs[feature] ?? configs['sub']

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)',
      zIndex: 200, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: '#111827', border: '1px solid var(--border)',
        borderRadius: 20, padding: '2.5rem 2rem',
        maxWidth: 420, width: '100%', textAlign: 'center',
        position: 'relative',
      }}>
        {/* Fermer */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'none', border: 'none', color: 'var(--muted)',
        }}>
          <X size={18} />
        </button>

        <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>{c.icon}</div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', color: 'var(--white)', marginBottom: '.4rem' }}>{c.title}</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>{c.desc}</p>

        {/* Prix */}
        <div style={{
          display: 'inline-block', background: '#1a1033',
          border: '1px solid #4a3080', borderRadius: 30,
          padding: '.5rem 1.5rem', marginBottom: '1.25rem',
        }}>
          <strong style={{ fontFamily: 'var(--font-head)', fontSize: '1.8rem', color: '#a78bfa' }}>22.99$</strong>
          <span style={{ fontSize: 13, color: '#7c6ab0' }}>/mois</span>
        </div>

        {/* Features */}
        <ul style={{ textAlign: 'left', marginBottom: '1.25rem', listStyle: 'none' }}>
          {c.features.map(f => (
            <li key={f} style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0', display: 'flex', gap: 8 }}>
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>✓</span> {f}
            </li>
          ))}
        </ul>

        {error && (
          <div style={{ padding: '8px 12px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: '.75rem' }}>
            {error}
          </div>
        )}
        <button onClick={handleSubscribe} disabled={loading} style={{
          width: '100%', padding: 14, background: loading ? 'var(--bg3)' : 'var(--purple)',
          border: 'none', borderRadius: 10, color: '#fff',
          fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 600,
          marginBottom: '.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? <><Loader size={16} className="spin" /> Redirection vers Stripe…</> : isLoggedIn ? "✨ S'abonner maintenant" : "🔑 Se connecter pour s'abonner"}
        </button>
        <br />
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--muted)',
          fontSize: 13, textDecoration: 'underline',
        }}>
          Non merci, rester gratuit
        </button>
      </div>
    </div>
  )
}
