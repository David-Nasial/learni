// ─── OnboardingModal — guide first-time & post-upgrade ───────────────────────
import { useState } from 'react'
import {
  X, ChevronRight, ChevronLeft, Sparkles, FileText, BarChart2, Rocket,
  Layers, Infinity as InfinityIcon, Calendar, Briefcase, GraduationCap,
  Bot, Users, School, ClipboardList, Target,
} from 'lucide-react'
import type { Plan, Page } from '../types'

type IconType = typeof FileText

interface Step {
  icon: IconType
  title: string
  desc: string
  action?: { label: string; page: Page }
  /** Étape qui demande son objectif à l'élève, pour personnaliser la suite. */
  askGoal?: boolean
}

// ─── Étapes par plan ──────────────────────────────────────────────────────────
const STEPS_FIRST: Step[] = [
  {
    icon: Sparkles,
    title: 'Bienvenue sur LearnI',
    desc: 'LearnI transforme tes documents de cours en révisions actives grâce à l\'IA. Quatre étapes pour tout comprendre.',
  },
  {
    icon: Target,
    title: 'Que veux-tu réviser ?',
    desc: 'Dis-nous sur quoi tu travailles en ce moment — on adaptera tes suggestions et ton tableau de bord.',
    askGoal: true,
  },
  {
    icon: FileText,
    title: 'Ton premier quiz en 10 secondes',
    desc: 'Importe un PDF, un manuel ou tes notes. L\'IA analyse le contenu et crée un quiz sur mesure, avec les explications de chaque réponse.',
    action: { label: 'Essayer maintenant', page: 'upload' },
  },
  {
    icon: BarChart2,
    title: 'Suis ta progression',
    desc: 'Chaque quiz est enregistré. Tu vois ton score, ton évolution, et les thèmes à retravailler en priorité.',
    action: { label: 'Voir mes résultats', page: 'history' },
  },
  {
    icon: Rocket,
    title: 'Tout est prêt',
    desc: 'Lance ton premier quiz. Les plans supérieurs ajoutent le tuteur IA, les cours générés, Mon Cartable et bien plus.',
    action: { label: 'Générer mon premier quiz', page: 'upload' },
  },
]

const STEPS_STARTER: Step[] = [
  {
    icon: Sparkles,
    title: 'Bienvenue dans le plan Starter',
    desc: 'Tu as maintenant plus de quiz par jour, les flashcards IA et l\'historique complet de tes résultats.',
  },
  {
    icon: FileText,
    title: '5 quiz par jour',
    desc: 'De quoi réviser plusieurs matières dans la même journée, avec jusqu\'à 35 questions par quiz.',
    action: { label: 'Générer un quiz', page: 'upload' },
  },
  {
    icon: Layers,
    title: 'Flashcards IA',
    desc: 'Importe un document et l\'IA en tire des cartes recto/verso. Tes jeux restent sauvegardés dans ta bibliothèque.',
    action: { label: 'Essayer les flashcards', page: 'flashcards' },
  },
  {
    icon: BarChart2,
    title: 'Historique illimité',
    desc: 'Tous tes résultats sont conservés — reviens quand tu veux mesurer le chemin parcouru.',
    action: { label: 'Voir mes résultats', page: 'history' },
  },
]

const STEPS_PRO: Step[] = [
  {
    icon: Sparkles,
    title: 'Bienvenue dans le plan Pro',
    desc: 'Quiz illimités, plan d\'étude intelligent, Mon Cartable et lecture audio par voix IA.',
  },
  {
    icon: InfinityIcon,
    title: 'Quiz illimités',
    desc: 'Plus aucune limite journalière. Génère autant de quiz que nécessaire, sur autant de documents que tu veux.',
    action: { label: 'Générer un quiz', page: 'upload' },
  },
  {
    icon: Calendar,
    title: 'Plan d\'étude et agenda',
    desc: 'Renseigne tes examens et tes disponibilités : l\'IA construit un planning qui évite tes jours chargés et cible tes points faibles.',
    action: { label: 'Ouvrir mon agenda', page: 'study' },
  },
  {
    icon: Briefcase,
    title: 'Mon Cartable',
    desc: 'Organise tes cours par chapitre, ajoute tes documents ou des photos de ton manuel, puis fais-toi lire le cours à voix haute et révise dessus.',
    action: { label: 'Ouvrir mon cartable', page: 'cartable' },
  },
  {
    icon: Layers,
    title: 'Flashcards IA',
    desc: 'Des cartes recto/verso générées depuis n\'importe quel chapitre, pour mémoriser plus vite.',
    action: { label: 'Essayer les flashcards', page: 'flashcards' },
  },
]

const STEPS_AUTODIDACTE: Step[] = [
  {
    icon: Sparkles,
    title: 'Bienvenue dans le plan Autodidacte',
    desc: 'Le plan complet pour apprendre en autonomie : cours générés, tuteur personnel, communautés et flashcards.',
  },
  {
    icon: GraduationCap,
    title: 'Des cours créés pour toi',
    desc: 'Choisis un sujet — Python, histoire, physique — et l\'IA construit un cours complet avec modules, leçons et exercices.',
    action: { label: 'Créer mon premier cours', page: 'courses' },
  },
  {
    icon: Bot,
    title: 'Ton tuteur IA',
    desc: 'Pose toutes tes questions. Il s\'adapte à ton niveau : pédagogue avec un débutant, exigeant en mode examen.',
    action: { label: 'Parler au tuteur', page: 'tutor' },
  },
  {
    icon: Calendar,
    title: 'Plan d\'étude et agenda',
    desc: 'Renseigne tes échéances et tes disponibilités : l\'IA construit un planning réaliste autour de ton emploi du temps.',
    action: { label: 'Ouvrir mon agenda', page: 'study' },
  },
  {
    icon: Users,
    title: 'Communautés d\'apprenants',
    desc: 'Rejoins des groupes par matière, partage tes notes et participe aux défis hebdomadaires.',
    action: { label: 'Explorer les communautés', page: 'community' },
  },
  {
    icon: Layers,
    title: 'Flashcards IA',
    desc: 'Des cartes mémoire générées automatiquement depuis tes documents ou tes cours.',
    action: { label: 'Essayer les flashcards', page: 'flashcards' },
  },
]

const STEPS_TEACHER: Step[] = [
  {
    icon: School,
    title: 'Bienvenue sur LearnI',
    desc: 'Gère tes classes, partage des documents et suis la progression de chaque élève depuis un seul tableau de bord.',
  },
  {
    icon: ClipboardList,
    title: 'Crée ta première classe',
    desc: 'Une classe génère un code que tes élèves saisissent pour la rejoindre. Chaque classe a son espace de discussion et de ressources.',
    action: { label: 'Ouvrir mon tableau de bord', page: 'teacher' },
  },
  {
    icon: FileText,
    title: 'Prépare des examens',
    desc: 'Importe un document de cours et génère un quiz — tu peux même préciser tes propres consignes d\'examen.',
    action: { label: 'Générer un quiz', page: 'upload' },
  },
  {
    icon: BarChart2,
    title: 'Suis tes élèves',
    desc: 'Consulte les résultats individuels et collectifs, et repère vite les élèves qui ont besoin d\'aide.',
    action: { label: 'Ouvrir mon tableau de bord', page: 'teacher' },
  },
]

// `role` prime sur le plan : un enseignant doit voir son guide dès sa première
// connexion, même avant d'avoir souscrit au plan Enseignant.
function getSteps(type: 'first' | Plan, role?: string): Step[] {
  if (role === 'teacher' && (type === 'first' || type === 'teacher')) return STEPS_TEACHER
  if (type === 'starter')     return STEPS_STARTER
  if (type === 'pro')         return STEPS_PRO
  if (type === 'autodidacte') return STEPS_AUTODIDACTE
  if (type === 'teacher')     return STEPS_TEACHER
  return STEPS_FIRST
}

// ─── Composant ────────────────────────────────────────────────────────────────
interface Props {
  type: 'first' | Plan
  role?: string
  onClose: () => void
  onNavigate: (page: Page) => void
  onSaveGoal?: (goal: string) => void
}

export function OnboardingModal({ type, role, onClose, onNavigate, onSaveGoal }: Props) {
  const steps = getSteps(type, role)
  const [idx, setIdx] = useState(0)
  const [goal, setGoal] = useState('')
  const step = steps[idx]
  const isLast = idx === steps.length - 1
  const Icon = step.icon

  const goNext = () => {
    if (step.askGoal && goal.trim()) onSaveGoal?.(goal.trim())
    if (isLast) { onClose(); return }
    setIdx(i => i + 1)
  }

  const handleAction = (page: Page) => {
    onClose()
    onNavigate(page)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid #4a3080',
        borderRadius: 24, width: '100%', maxWidth: 480,
        padding: '2.5rem 2rem 2rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Fond décoratif */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(139,92,246,.08)', pointerEvents: 'none',
        }} />

        {/* Bouton fermer */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)',
        }}>
          <X size={15} />
        </button>

        {/* Indicateurs de progression */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '2rem' }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              height: 4, flex: 1, borderRadius: 4,
              background: i <= idx
                ? 'linear-gradient(90deg, var(--purple), var(--red))'
                : 'var(--bg3)',
              transition: 'background .3s',
            }} />
          ))}
        </div>

        {/* Contenu */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, #2d1b69, #1a1033)',
            border: '1px solid #4a3080',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={26} style={{ color: '#a78bfa' }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-head)', fontSize: '1.35rem', fontWeight: 800,
            color: 'var(--white)', marginBottom: '.75rem', lineHeight: 1.3,
          }}>
            {step.title}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.75 }}>
            {step.desc}
          </p>

          {step.askGoal && (
            <input
              autoFocus
              value={goal}
              onChange={e => setGoal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') goNext() }}
              placeholder="Ex : Assurance de personnes, Biologie 101…"
              style={{
                width: '100%', boxSizing: 'border-box', marginTop: '1.25rem',
                padding: '11px 14px', background: 'var(--bg3)',
                border: '1px solid var(--border)', borderRadius: 10,
                color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
                textAlign: 'center',
              }}
            />
          )}
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {/* Action secondaire (raccourci vers une page) */}
          {step.action && (
            <button onClick={() => handleAction(step.action!.page)} style={{
              padding: '12px', borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              border: 'none', color: '#fff',
              fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 0 20px rgba(139,92,246,.3)',
            }}>
              {step.action.label} →
            </button>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '.5rem' }}>
            {idx > 0 && (
              <button onClick={() => setIdx(i => i - 1)} style={{
                flex: 1, padding: '11px', borderRadius: 10,
                background: 'var(--bg3)', border: '1px solid var(--border)',
                color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <ChevronLeft size={15} /> Précédent
              </button>
            )}
            <button onClick={goNext} style={{
              flex: 1, padding: '11px', borderRadius: 10,
              background: isLast ? 'var(--green)' : 'var(--bg3)',
              border: `1px solid ${isLast ? 'var(--green)' : 'var(--border)'}`,
              color: isLast ? '#fff' : 'var(--text)',
              fontFamily: isLast ? 'var(--font-head)' : 'inherit',
              fontWeight: isLast ? 700 : 400,
              cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              {isLast ? 'Commencer' : <>Suivant <ChevronRight size={15} /></>}
            </button>
          </div>

          {/* Skip */}
          {!isLast && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'var(--muted)',
              fontSize: 12, cursor: 'pointer', padding: '4px',
            }}>
              Passer le guide
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
