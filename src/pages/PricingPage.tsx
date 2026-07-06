import { useState } from 'react'
// ─── Page Tarification — LearnI ───────────────────────────────────────────────
import { Check, X } from 'lucide-react'
import { startCheckout, type StripePlan } from '../utils/stripe'
import { useAuth } from '../hooks/useAuth'
import type { AppMode } from '../types'

interface Props {
  onUpgrade: (plan: 'starter' | 'pro' | 'autodidacte') => void
  onTeacher: () => void
  appMode:   AppMode
  onLogin:   () => void
}

// ── Données des plans ──────────────────────────────────────────────────────────

const planFree = [
  { label: '2 quiz par jour',                    ok: true  },
  { label: 'Import PDF, TXT, MD',                ok: true  },
  { label: 'Historique des résultats',           ok: true  },
  { label: '10 ou 20 questions par quiz',        ok: true  },
  { label: 'Flashcards IA',                      ok: false },
  { label: 'Explications détaillées sur échecs', ok: false },
  { label: 'Plan d\'étude IA',                   ok: false },
  { label: 'Mon Cartable (UAs + révision)',       ok: false },
  { label: 'Tuteur IA conversationnel',           ok: false },
  { label: 'Génération de cours complets',        ok: false },
]

const planStarter = [
  { label: '5 quiz par jour',                    ok: true  },
  { label: 'Import PDF, TXT, MD',                ok: true  },
  { label: 'Historique complet cloud',           ok: true  },
  { label: '10 ou 20 questions par quiz',        ok: true  },
  { label: 'Flashcards IA (sauvegardées)',        ok: true  },
  { label: 'Explications détaillées sur échecs', ok: true  },
  { label: 'Plan d\'étude IA',                   ok: false },
  { label: 'Mon Cartable (UAs + révision)',       ok: false },
  { label: 'Tuteur IA conversationnel',           ok: false },
  { label: 'Génération de cours complets',        ok: false },
]

const planPro = [
  { label: 'Quiz illimités',                     ok: true  },
  { label: 'Import PDF, TXT, MD illimité',       ok: true  },
  { label: 'Historique complet cloud',           ok: true  },
  { label: '10 ou 20 questions par quiz',        ok: true  },
  { label: 'Flashcards IA (sauvegardées)',        ok: true  },
  { label: 'Explications détaillées sur échecs', ok: true  },
  { label: 'Plan d\'étude IA',                   ok: true  },
  { label: 'Mon Cartable (UAs + révision examen)',ok: true  },
  { label: 'Tuteur IA conversationnel',           ok: false },
  { label: 'Génération de cours complets',        ok: false },
]

const planAutodidacte = [
  { label: 'Quiz illimités',                     ok: true  },
  { label: 'Import PDF, TXT, MD illimité',       ok: true  },
  { label: 'Flashcards IA (sauvegardées)',        ok: true  },
  { label: 'Explications détaillées sur échecs', ok: true  },
  { label: 'Plan d\'étude IA',                   ok: true  },
  { label: 'Mon Cartable (UAs + révision examen)',ok: true  },
  { label: 'Tuteur IA (débutant / prof / exam)', ok: true  },
  { label: 'Tuteur IA dans les cours (flottant)',ok: true  },
  { label: 'Génération de cours complets IA',    ok: true  },
  { label: 'Communautés & défis d\'apprentissage',ok: true },
]

const planTeacher = [
  { label: 'Quiz illimités',                     ok: true  },
  { label: 'Import PDF, TXT, MD illimité',       ok: true  },
  { label: 'Flashcards IA (sauvegardées)',        ok: true  },
  { label: 'Explications détaillées sur échecs', ok: true  },
  { label: 'Plan d\'étude IA',                   ok: true  },
  { label: 'Mon Cartable (UAs + révision examen)',ok: true  },
  { label: 'Tableau de bord enseignant',         ok: true  },
  { label: 'Gestion de classes illimitées',      ok: true  },
  { label: 'Suivi individuel par élève',         ok: true  },
  { label: 'Code de classe & invitations',       ok: true  },
]

// ── Composant principal ────────────────────────────────────────────────────────
export function PricingPage({ appMode, onLogin }: Props) {
  const isSchool = appMode === 'school'
  const { user } = useAuth()
  const [checkoutError, setCheckoutError] = useState('')

  const handleCheckout = async (plan: StripePlan) => {
    if (!user) { onLogin(); return }
    setCheckoutError('')
    try {
      await startCheckout(plan)
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Titre */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 800, color: 'var(--white)', marginBottom: '.5rem' }}>
          Choisissez votre plan
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          {isSchool
            ? 'Plans adaptés aux établissements scolaires — profs, élèves et administrations.'
            : 'Commencez gratuitement — passez à un plan supérieur quand vous êtes prêt.'}
        </p>
        {isSchool && (
          <div style={{ display: 'inline-block', marginTop: '.75rem', padding: '5px 14px', borderRadius: 20, background: '#1a1033', border: '1px solid #4a3080', fontSize: 12, color: '#a78bfa' }}>
            🏫 Mode Établissement scolaire — plans surlignés = recommandés pour vous
          </div>
        )}
      </div>

      {checkoutError && (
        <div style={{ maxWidth: 500, margin: '0 auto 1rem', padding: '10px 16px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, textAlign: 'center' }}>
          {checkoutError}
        </div>
      )}

      {/* Grille des plans */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isSchool
          ? 'repeat(auto-fit, minmax(240px, 1fr))'
          : 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem', alignItems: 'start',
      }}>

        {/* GRATUIT — toujours visible */}
        <PlanCard
          badge=""
          title="Gratuit"
          price="0$" period=""
          desc="Pour découvrir LearnI sans engagement."
          features={planFree}
          ctaLabel="Continuer gratuitement"
          ctaColor="outline"
          onCta={() => {}}
          highlight={false}
          dimmed={isSchool}
        />

        {/* STARTER — usage personnel seulement */}
        {!isSchool && (
          <PlanCard
            badge="💡 Bon rapport qualité/prix"
            title="Starter"
            price="9.99$" period="/mois"
            desc="Pour les étudiants qui veulent plus de flexibilité."
            features={planStarter}
            ctaLabel="Choisir Starter"
            ctaColor="gold"
            onCta={() => handleCheckout('starter')}
            highlight={false}
            dimmed={false}
          />
        )}

        {/* PRO — toujours visible, recommandé pour école */}
        <PlanCard
          badge={isSchool ? '✅ Recommandé élèves' : '⭐ Le plus populaire'}
          title="Pro"
          price="22.99$" period="/mois"
          desc={isSchool
            ? 'Idéal pour les élèves — accès complet à tous les outils de révision.'
            : 'Accès complet à toutes les fonctionnalités sans limite.'}
          features={planPro}
          ctaLabel="Choisir Pro"
          ctaColor="red"
          onCta={() => handleCheckout('pro')}
          highlight={true}
          dimmed={false}
        />

        {/* AUTODIDACTE — usage personnel seulement */}
        {!isSchool && (
          <PlanCard
            badge="🧠 Ultra complet"
            title="Autodidacte Complet"
            price="35.99$" period="/mois"
            desc="Pour apprendre n'importe quoi de façon autonome : tuteur IA, plan d'étude, génération de cours."
            features={planAutodidacte}
            ctaLabel="Devenir Autodidacte"
            ctaColor="teal"
            onCta={() => handleCheckout('autodidacte')}
            highlight={false}
            dimmed={false}
          />
        )}

        {/* ENSEIGNANT — toujours visible, recommandé pour école */}
        <PlanCard
          badge={isSchool ? '✅ Recommandé profs & admin' : '🏫 Institutions'}
          title="Enseignant"
          price="35.99$" period="/mois"
          desc={isSchool
            ? 'Pour les professeurs — gérez vos classes et suivez chaque élève en temps réel.'
            : 'Pour les profs, écoles et universités.'}
          features={planTeacher}
          ctaLabel="Démarrer avec une classe"
          ctaColor="purple"
          onCta={() => handleCheckout('teacher')}
          highlight={isSchool}
          dimmed={false}
        />
      </div>

      {/* Section Autodidacte Complet — détail (personal only) */}
      {!isSchool && (
        <div style={{ marginTop: '3rem', background: 'linear-gradient(135deg,#0f1f2e,#0d2318)', border: '1px solid #1a4a3a', borderRadius: 16, padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🧠</div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--white)', marginBottom: '.4rem' }}>
                Autodidacte Complet — 35.99$/mois
              </h3>
              <p style={{ fontSize: 13, color: '#6ee7b7', lineHeight: 1.6 }}>
                La suite complète pour apprendre seul, efficacement, n'importe quel sujet.
              </p>
            </div>
            <div style={{ flex: 2, minWidth: 280, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {[
                {
                  icon: '🤖', title: 'Tuteur IA conversationnel',
                  desc: 'Posez n\'importe quelle question. Le tuteur s\'adapte : mode prof strict, mode débutant, mode examen.',
                },
                {
                  icon: '📅', title: 'Plan d\'étude intelligent',
                  desc: 'L\'IA crée un calendrier personnalisé avec objectifs, rappels et révisions espacées.',
                },
                {
                  icon: '📚', title: 'Génération de cours',
                  desc: 'Dites "Je veux apprendre Linux" — l\'IA génère modules, exercices, quiz et un parcours complet.',
                },
              ].map(f => (
                <div key={f.title} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 10, padding: '1rem' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: '.4rem' }}>{f.icon}</div>
                  <h4 style={{ fontFamily: 'var(--font-head)', fontSize: '.85rem', color: '#fff', marginBottom: '.3rem' }}>{f.title}</h4>
                  <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            {['Cybersécurité', 'Médecine', 'Certifications', 'Armée', 'Langues', 'Programmation', 'Mathématiques'].map(tag => (
              <span key={tag} style={{ padding: '3px 12px', borderRadius: 20, background: 'rgba(110,231,183,.1)', border: '1px solid rgba(110,231,183,.2)', fontSize: 12, color: '#6ee7b7' }}>
                {tag}
              </span>
            ))}
            <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>et bien plus…</span>
          </div>
        </div>
      )}

      {/* Comparatif */}
      <div style={{ marginTop: '2.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)' }}>
            Comparatif rapide
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {(isSchool
                  ? ['Fonctionnalité', 'Gratuit', 'Pro 22.99$', 'Enseignant 35.99$']
                  : ['Fonctionnalité', 'Gratuit', 'Starter 9.99$', 'Pro 22.99$', 'Autodidacte 35.99$']
                ).map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Fonctionnalité' ? 'left' : 'center', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(isSchool ? [
                ['Quiz par jour',              '2',       'Illimité',  'Illimité'],
                ['Flashcards IA',              '❌',      '✅',        '✅'],
                ['Explications sur échecs',    '❌',      'Détaillées','Détaillées'],
                ['Plan d\'étude IA',           '❌',      '✅',        '✅'],
                ['Mon Cartable + révision',    '❌',      '✅',        '✅'],
                ['Gestion de classes',         '❌',      '❌',        '✅'],
                ['Suivi élèves',               '❌',      '❌',        '✅'],
                ['Code de classe',             '❌',      '❌',        '✅'],
              ] : [
                ['Quiz par jour',              '2',       '5',         'Illimité',   'Illimité'],
                ['Flashcards IA',              '❌',      '✅',        '✅',         '✅'],
                ['Explications sur échecs',    '❌',      'Détaillées','Détaillées', 'Détaillées'],
                ['Plan d\'étude IA',           '❌',      '❌',        '✅',         '✅'],
                ['Mon Cartable + révision',    '❌',      '❌',        '✅',         '✅'],
                ['Tuteur IA',                  '❌',      '❌',        '❌',         '✅'],
                ['Génération de cours',        '❌',      '❌',        '❌',         '✅'],
                ['Communautés',                '❌',      '❌',        '❌',         '✅'],
              ]).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                  <td style={{ padding: '9px 14px', color: 'var(--text)', fontWeight: 500 }}>{row[0]}</td>
                  {row.slice(1).map((val, j) => (
                    <td key={j} style={{ padding: '9px 14px', textAlign: 'center', color: val === '❌' ? '#444' : val === '✅' ? 'var(--green)' : 'var(--muted)' }}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 640, margin: '2.5rem auto 0' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: '1.25rem', textAlign: 'center' }}>
          Questions fréquentes
        </h2>
        {(isSchool ? [
          { q: 'Quelle est la différence entre Pro et Enseignant ?', a: "Pro est pour les élèves : ils accèdent à tous les outils de révision. Enseignant est pour les profs : gestion de classes, codes d'accès élèves, suivi des résultats. Les deux fonctionnent ensemble." },
          { q: 'Combien de classes peut-on créer ?', a: "Autant que vous voulez — abonnement mensuel fixe à 35.99$/mois." },
          { q: 'Les élèves ont-ils besoin d\'un compte Pro ?', a: "Non. Les élèves peuvent avoir un compte gratuit ou Pro selon leurs besoins. L'enseignant voit leurs résultats dès qu'ils rejoignent la classe avec le code." },
          { q: 'Puis-je annuler à tout moment ?', a: "Oui, aucun engagement. L'abonnement se renouvelle chaque mois et vous pouvez annuler quand vous voulez." },
        ] : [
          { q: 'Quelle est la différence entre Pro et Autodidacte ?', a: "Pro donne accès à tous les outils de révision (flashcards, caméra, export). Autodidacte ajoute le tuteur IA conversationnel, la génération de cours complets et le plan d'étude personnalisé — idéal pour apprendre seul sans professeur." },
          { q: 'À quoi sert le plan Starter ?', a: "Starter donne 5 quiz/jour, les flashcards IA sauvegardées et des explications très détaillées sur chaque question ratée — idéal pour progresser rapidement sans dépenser 22.99$." },
          { q: 'Le plan Autodidacte convient à quoi ?', a: "Cybersécurité, médecine, certifications, langues, programmation, préparation militaire… N'importe quel sujet où vous devez apprendre seul sans cours structuré." },
          { q: 'Puis-je annuler à tout moment ?', a: "Oui, aucun engagement. L'abonnement se renouvelle chaque mois et vous pouvez annuler quand vous voulez." },
        ]).map(faq => (
          <div key={faq.q} style={{ marginBottom: '1rem', padding: '1rem 1.25rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <p style={{ fontWeight: 600, color: 'var(--white)', marginBottom: '.4rem', fontSize: 14 }}>{faq.q}</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Carte de plan ──────────────────────────────────────────────────────────────
interface PlanCardProps {
  badge:    string
  title:    string
  price:    string
  period:   string
  desc:     string
  features: { label: string; ok: boolean }[]
  ctaLabel: string
  ctaColor: 'outline' | 'gold' | 'red' | 'purple' | 'teal'
  onCta:    () => void
  highlight: boolean
  dimmed:   boolean
}

function PlanCard({ badge, title, price, period, desc, features, ctaLabel, ctaColor, onCta, highlight, dimmed }: PlanCardProps) {
  const bgMap: Record<string, string> = {
    outline: 'transparent',
    gold:    '#92400e',
    red:     'var(--red)',
    purple:  'var(--purple)',
    teal:    '#0f766e',
  }
  const borderMap: Record<string, string> = {
    outline: '1px solid var(--border)',
    gold: 'none', red: 'none', purple: 'none', teal: 'none',
  }

  return (
    <div style={{
      background:  'var(--bg2)',
      border:      `1px solid ${highlight ? (ctaColor === 'purple' ? 'var(--purple)' : 'var(--red)') : 'var(--border)'}`,
      borderRadius: 16,
      padding:     '1.5rem 1.25rem',
      position:    'relative',
      opacity:     dimmed ? .45 : 1,
      transition:  'opacity .2s',
      boxShadow:   highlight ? `0 0 28px rgba(${ctaColor === 'purple' ? '124,58,237' : '224,60,60'},.18)` : 'none',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: ctaColor === 'red' ? 'var(--red)' : ctaColor === 'purple' ? 'var(--purple)' : ctaColor === 'teal' ? '#0f766e' : '#92400e',
          color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap',
        }}>{badge}</div>
      )}

      <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: '.35rem' }}>{title}</h3>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '.35rem' }}>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: '2rem', fontWeight: 800, color: 'var(--white)' }}>{price}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{period}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.55 }}>{desc}</p>

      <button onClick={onCta} style={{
        width: '100%', padding: '11px 0',
        background: bgMap[ctaColor], border: borderMap[ctaColor],
        borderRadius: 9,
        color: ctaColor === 'outline' ? 'var(--muted)' : '#fff',
        fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 600,
        marginBottom: '1rem', cursor: 'pointer',
      }}>{ctaLabel}</button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {features.map(f => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {f.ok
              ? <Check size={13} color="var(--green)" style={{ flexShrink: 0 }} />
              : <X     size={13} color="#444"         style={{ flexShrink: 0 }} />
            }
            <span style={{ fontSize: 12, color: f.ok ? 'var(--text)' : 'var(--muted)' }}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}