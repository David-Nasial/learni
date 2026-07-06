// ─── OnboardingModal — guide first-time & post-upgrade ───────────────────────
import { useState } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import type { Plan, Page } from '../types'

interface Step {
  emoji: string
  title: string
  desc: string
  action?: { label: string; page: Page }
}

// ─── Étapes par plan ──────────────────────────────────────────────────────────
const STEPS_FIRST: Step[] = [
  {
    emoji: '👋',
    title: 'Bienvenue sur LearnI !',
    desc: 'LearnI utilise l\'IA pour t\'aider à réviser plus vite et plus efficacement. On va te montrer comment ça marche en 4 étapes.',
  },
  {
    emoji: '📄',
    title: 'Génère un quiz en 10 secondes',
    desc: 'Importe n\'importe quel PDF, manuel ou notes de cours. L\'IA analyse le contenu et crée un quiz sur mesure instantanément.',
    action: { label: 'Essayer maintenant', page: 'upload' },
  },
  {
    emoji: '📊',
    title: 'Suis tes progrès',
    desc: 'Chaque quiz est enregistré dans ton historique. Tu peux voir ton score, ta progression et identifier tes points faibles.',
    action: { label: 'Voir mon historique', page: 'history' },
  },
  {
    emoji: '🚀',
    title: 'Tu es prêt !',
    desc: 'Lance ton premier quiz maintenant. Si tu veux plus de fonctionnalités (Tuteur IA, Cours, Flashcards), explore nos plans.',
    action: { label: 'Générer mon premier quiz', page: 'upload' },
  },
]

const STEPS_STARTER: Step[] = [
  {
    emoji: '🎉',
    title: 'Bienvenue dans le plan Starter !',
    desc: 'Tu as maintenant accès à plus de quiz par jour et à l\'historique complet de tes résultats.',
  },
  {
    emoji: '📄',
    title: '5 quiz par jour',
    desc: 'Tu peux générer jusqu\'à 5 quiz par jour — idéal pour réviser plusieurs matières sans limite.',
    action: { label: 'Générer un quiz', page: 'upload' },
  },
  {
    emoji: '🃏',
    title: 'Flashcards IA',
    desc: 'Nouveau ! Importe un PDF et l\'IA génère des cartes recto/verso pour mémoriser plus vite. Tes jeux sont sauvegardés dans ta bibliothèque.',
    action: { label: 'Essayer les flashcards', page: 'flashcards' },
  },
  {
    emoji: '📊',
    title: 'Historique illimité',
    desc: 'Tous tes résultats sont sauvegardés. Reviens quand tu veux pour voir ta progression.',
    action: { label: 'Voir mon historique', page: 'history' },
  },
]

const STEPS_PRO: Step[] = [
  {
    emoji: '🔥',
    title: 'Bienvenue dans le plan Pro !',
    desc: 'Quiz illimités, plan d\'étude intelligent et flashcards IA. Tu as tout ce qu\'il faut pour exceller.',
  },
  {
    emoji: '♾️',
    title: 'Quiz illimités',
    desc: 'Plus de limite journalière. Génère autant de quiz que tu veux, quand tu veux.',
    action: { label: 'Générer un quiz', page: 'upload' },
  },
  {
    emoji: '📅',
    title: 'Plan d\'étude + Mon Agenda',
    desc: 'Ajoute tes examens, ton travail et tes disponibilités dans Mon Agenda. L\'IA génère ensuite un plan qui évite tes jours occupés et renforce tes matières faibles.',
    action: { label: 'Ouvrir mon agenda', page: 'study' },
  },
  {
    emoji: '🎒',
    title: 'Mon Cartable',
    desc: 'Organise tes cours en cahiers et unités d\'apprentissage (UA), téléverse tes notes et génère des révisions ciblées avec corrections détaillées.',
    action: { label: 'Ouvrir mon cartable', page: 'cartable' },
  },
  {
    emoji: '🃏',
    title: 'Flashcards IA',
    desc: 'Génère des cartes recto/verso depuis tes documents pour mémoriser plus rapidement.',
    action: { label: 'Essayer les flashcards', page: 'flashcards' },
  },
]

const STEPS_AUTODIDACTE: Step[] = [
  {
    emoji: '🌟',
    title: 'Bienvenue dans le plan Autodidacte !',
    desc: 'Le plan complet pour apprendre seul : cours générés par l\'IA, tuteur personnel, communautés et flashcards.',
  },
  {
    emoji: '🎓',
    title: 'Cours générés par l\'IA',
    desc: 'Choisis n\'importe quel sujet — Python, Histoire, Physique — et l\'IA crée un cours complet avec modules, leçons et exercices.',
    action: { label: 'Créer mon premier cours', page: 'courses' },
  },
  {
    emoji: '🤖',
    title: 'Tuteur IA personnel',
    desc: 'Pose toutes tes questions à ton tuteur IA. Il s\'adapte à ton niveau : débutant, normal ou mode examen strict.',
    action: { label: 'Parler au tuteur', page: 'tutor' },
  },
  {
    emoji: '🏘️',
    title: 'Communautés d\'apprenants',
    desc: 'Rejoins des groupes d\'étude par matière, partage tes notes, participe aux défis hebdomadaires.',
    action: { label: 'Explorer les communautés', page: 'community' },
  },
  {
    emoji: '🃏',
    title: 'Flashcards IA',
    desc: 'Cartes mémoire générées automatiquement depuis tes documents ou tes cours.',
    action: { label: 'Essayer les flashcards', page: 'flashcards' },
  },
]

const STEPS_TEACHER: Step[] = [
  {
    emoji: '🏫',
    title: 'Bienvenue, enseignant(e) !',
    desc: 'Gérez vos classes, partagez des documents et suivez la progression de chaque élève depuis votre tableau de bord.',
  },
  {
    emoji: '📋',
    title: 'Créez vos classes',
    desc: 'Créez une classe, invitez vos élèves par code ou lien. Chaque classe a son propre espace de discussion.',
    action: { label: 'Voir mon tableau de bord', page: 'teacher' },
  },
  {
    emoji: '📄',
    title: 'Partagez des quiz',
    desc: 'Importez un document de cours et générez un quiz à partager avec toute la classe en un clic.',
    action: { label: 'Générer un quiz', page: 'upload' },
  },
  {
    emoji: '📊',
    title: 'Suivez vos élèves',
    desc: 'Consultez les résultats individuels et collectifs. Identifiez rapidement les élèves qui ont besoin d\'aide.',
    action: { label: 'Voir mon tableau de bord', page: 'teacher' },
  },
]

function getSteps(type: 'first' | Plan): Step[] {
  if (type === 'first')         return STEPS_FIRST
  if (type === 'starter')       return STEPS_STARTER
  if (type === 'pro')           return STEPS_PRO
  if (type === 'autodidacte')   return STEPS_AUTODIDACTE
  if (type === 'teacher')       return STEPS_TEACHER
  return STEPS_FIRST
}

// ─── Composant ────────────────────────────────────────────────────────────────
interface Props {
  type: 'first' | Plan
  onClose: () => void
  onNavigate: (page: Page) => void
}

export function OnboardingModal({ type, onClose, onNavigate }: Props) {
  const steps = getSteps(type)
  const [idx, setIdx] = useState(0)
  const step = steps[idx]
  const isLast = idx === steps.length - 1

  const goNext = () => {
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
        background: 'var(--bg2)', border: '1px solid #3d2b6b',
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
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>
            {step.emoji}
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
              {isLast ? 'C\'est parti ! 🎯' : <>Suivant <ChevronRight size={15} /></>}
            </button>
          </div>

          {/* Skip */}
          {!isLast && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#555',
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
