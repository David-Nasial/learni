import { useState, useEffect } from 'react'
import { BookOpen, ChevronRight, ChevronDown, CheckCircle, Circle, Loader, ArrowLeft, Zap } from 'lucide-react'
import {
  getAssessmentQuestions, generateAndSaveCourse, getUserCourses, getCourseDetails, toggleLesson,
  type UserCourse, type CourseModule, type CourseLesson,
} from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'

type Level = 'debutant' | 'intermediaire' | 'expert'
type Step  = 'list' | 'new' | 'assess' | 'generating' | 'course'

const LEVEL_LABELS: Record<Level, string> = {
  debutant:      '🟢 Débutant',
  intermediaire: '🟡 Intermédiaire',
  expert:        '🔴 Expert',
}

const SUGGESTED = ['Cybersécurité', 'Python', 'JavaScript', 'Algèbre linéaire', 'Histoire du Québec', 'Chimie organique', 'Intelligence artificielle', 'Comptabilité']

interface AssessQuestion {
  question: string
  choices: string[]
  answerIndex: number
  level: Level
}

export function CoursesPage() {
  const { user, profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin'
  const hasAccess = isSuperadmin || profile?.plan === 'autodidacte'  // Autodidacte ONLY

  const [step,         setStep]         = useState<Step>('list')
  const [courses,      setCourses]       = useState<UserCourse[]>([])
  const [activeCourse, setActiveCourse]  = useState<UserCourse | null>(null)
  const [modules,      setModules]       = useState<(CourseModule & { lessons: CourseLesson[] })[]>([])
  const [openModule,   setOpenModule]    = useState<string | null>(null)
  const [activeLesson, setActiveLesson]  = useState<CourseLesson | null>(null)
  const [subject,      setSubject]       = useState('')
  const [questions,    setQuestions]     = useState<AssessQuestion[]>([])
  const [answers,      setAnswers]       = useState<number[]>([])
  const [level,        setLevel]         = useState<Level | null>(null)
  const [loading,      setLoading]       = useState(true)
  const [error,        setError]         = useState('')

  useEffect(() => {
    if (!user || !hasAccess) { setLoading(false); return }
    getUserCourses(user.id).then(c => { setCourses(c); setLoading(false) })
  }, [user])

  // Calcul progression d'un cours
  const getCourseProgress = (mods: (CourseModule & { lessons: CourseLesson[] })[]) => {
    const total = mods.reduce((a, m) => a + (m.lessons?.length ?? 0), 0)
    const done  = mods.reduce((a, m) => a + (m.lessons?.filter(l => l.done).length ?? 0), 0)
    return total > 0 ? Math.round((done / total) * 100) : 0
  }

  // Étape 1 : saisir le sujet
  const handleStartNew = async () => {
    if (!subject.trim()) return
    setError('')
    setStep('assess')
    try {
      const data = await getAssessmentQuestions(subject.trim())
      setQuestions((data.questions as AssessQuestion[]) ?? [])
      setAnswers([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setStep('new')
    }
  }

  // Étape 2 : répondre aux questions → calculer le niveau
  const handleFinishAssess = () => {
    const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0), 0)
    const pct = (correct / questions.length) * 100
    const lvl: Level = pct >= 70 ? 'expert' : pct >= 40 ? 'intermediaire' : 'debutant'
    setLevel(lvl)
    handleGenerateCourse(lvl)
  }

  // Étape 3 : générer le cours
  const handleGenerateCourse = async (lvl: Level) => {
    if (!user) return
    setStep('generating')
    setError('')
    try {
      const course = await generateAndSaveCourse(user.id, subject.trim(), lvl)
      setCourses(prev => [course, ...prev])
      await openCourse(course)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setStep('new')
    }
  }

  const openCourse = async (course: UserCourse) => {
    setActiveCourse(course)
    const details = await getCourseDetails(course.id)
    setModules(details.modules)
    if (details.modules.length > 0) setOpenModule(details.modules[0].id)
    setActiveLesson(null)
    setStep('course')
  }

  const handleToggleLesson = async (lesson: CourseLesson) => {
    await toggleLesson(lesson.id, !lesson.done)
    setModules(prev => prev.map(m => ({
      ...m,
      lessons: (m.lessons ?? []).map(l => l.id === lesson.id ? { ...l, done: !l.done } : l),
    })))
    if (activeLesson?.id === lesson.id) setActiveLesson({ ...lesson, done: !lesson.done })
  }

  if (!hasAccess) {
    return (
      <div className="fade-in" style={{ maxWidth: 560, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', color: 'var(--white)', marginBottom: '.5rem' }}>Mes Cours</h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Disponible uniquement avec le plan <strong style={{ color: '#a78bfa' }}>Autodidacte</strong>.<br/>Ce plan inclut la création de cours IA personnalisés sur toute matière, le tuteur IA et les communautés.
        </p>
      </div>
    )
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
      <Loader size={32} style={{ color: 'var(--muted)' }} className="spin" />
    </div>
  )

  // ── Vue cours ouvert ──────────────────────────────────────────────────────
  if (step === 'course' && activeCourse) {
    const progress = getCourseProgress(modules)
    return (
      <div className="fade-in" style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        {/* Sidebar modules */}
        <aside style={{
          width: 280, flexShrink: 0, background: 'var(--bg2)',
          borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => { setStep('list'); setActiveCourse(null) }} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none',
              border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', marginBottom: 10,
            }}>
              <ArrowLeft size={14} /> Mes cours
            </button>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '0.95rem' }}>{activeCourse.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{LEVEL_LABELS[activeCourse.level]}</div>
            {/* Barre progression */}
            <div style={{ background: 'var(--bg3)', borderRadius: 6, height: 6, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--purple), var(--red))', transition: 'width .4s' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{progress}% complété</div>
          </div>

          <div style={{ flex: 1, padding: '.5rem' }}>
            {modules.map((mod, mi) => (
              <div key={mod.id}>
                <button onClick={() => setOpenModule(openModule === mod.id ? null : mod.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 10px', borderRadius: 8, border: 'none',
                  background: openModule === mod.id ? 'var(--bg3)' : 'transparent',
                  color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--red)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {mi + 1}
                  </span>
                  <span style={{ flex: 1 }}>{mod.title}</span>
                  {openModule === mod.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {openModule === mod.id && (mod.lessons ?? []).map(lesson => (
                  <button key={lesson.id} onClick={() => setActiveLesson(lesson)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px 8px 42px', borderRadius: 6, border: 'none',
                    background: activeLesson?.id === lesson.id ? '#1a1033' : 'transparent',
                    color: activeLesson?.id === lesson.id ? '#a78bfa' : lesson.done ? 'var(--green)' : 'var(--muted)',
                    fontSize: 13, cursor: 'pointer', textAlign: 'left',
                  }}>
                    {lesson.done ? <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /> : <Circle size={14} style={{ flexShrink: 0 }} />}
                    {lesson.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Contenu leçon */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {!activeLesson ? (
            <div style={{ maxWidth: 600, margin: '3rem auto', textAlign: 'center' }}>
              <BookOpen size={48} style={{ color: 'var(--border2)', marginBottom: '1rem' }} />
              <h2 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '.5rem' }}>{activeCourse.title}</h2>
              <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>{activeCourse.description}</p>
              <button onClick={() => { if (modules[0]?.lessons[0]) setActiveLesson(modules[0].lessons[0]) }} style={{
                padding: '12px 28px', background: 'var(--purple)', border: 'none',
                borderRadius: 10, color: '#fff', fontFamily: 'var(--font-head)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                Commencer le cours →
              </button>
            </div>
          ) : (
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: '.5rem' }}>
                {modules.find(m => m.lessons.some(l => l.id === activeLesson.id))?.title}
              </div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--white)', marginBottom: '1.5rem' }}>
                {activeLesson.title}
              </h2>
              {/* Contenu */}
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem',
                lineHeight: 1.8, color: 'var(--text)', fontSize: 15,
                whiteSpace: 'pre-wrap',
              }}>
                {activeLesson.content}
              </div>
              {/* Exercice */}
              {activeLesson.exercise && (
                <div style={{
                  background: 'linear-gradient(135deg, #12101e, #1a1033)',
                  border: '1px solid #3d2b6b', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '.75rem' }}>
                    <Zap size={18} style={{ color: '#a78bfa' }} />
                    <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: '#a78bfa', fontSize: 14 }}>Exercice pratique</span>
                  </div>
                  <p style={{ color: 'var(--text)', lineHeight: 1.7, fontSize: 14 }}>{activeLesson.exercise}</p>
                </div>
              )}
              {/* Bouton marquer comme fait */}
              <button onClick={() => handleToggleLesson(activeLesson)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 10,
                background: activeLesson.done ? 'var(--bg3)' : 'var(--green)',
                border: activeLesson.done ? '1px solid var(--border)' : 'none',
                color: activeLesson.done ? 'var(--muted)' : '#fff',
                fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                {activeLesson.done ? <><Circle size={16} /> Marquer comme non fait</> : <><CheckCircle size={16} /> Marquer comme terminé</>}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Vue génération en cours ───────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)', textAlign: 'center', padding: '2rem' }}>
        <Loader size={48} style={{ color: 'var(--purple)' }} className="spin" />
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', color: 'var(--white)', marginTop: '1.5rem', marginBottom: '.5rem' }}>
          L'IA crée votre cours…
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Génération des modules, leçons et exercices pour <strong style={{ color: 'var(--white)' }}>{subject}</strong> — niveau {level && LEVEL_LABELS[level]}
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: '.5rem' }}>Cela peut prendre 15-30 secondes…</p>
      </div>
    )
  }

  // ── Vue évaluation de niveau ──────────────────────────────────────────────
  if (step === 'assess') {
    if (questions.length === 0 || !questions[0]) return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader size={32} style={{ color: 'var(--muted)' }} className="spin" />
      </div>
    )
    const currentQ = answers.length
    const finished = currentQ >= questions.length

    return (
      <div className="fade-in" style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1.5rem' }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: '.5rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Évaluation de niveau — {subject}
          </div>
          {/* Barre progression */}
          <div style={{ background: 'var(--bg3)', borderRadius: 6, height: 4, marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(currentQ / questions.length) * 100}%`, background: 'var(--purple)', transition: 'width .3s' }} />
          </div>

          {!finished && questions[currentQ] ? (
            <>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: '.75rem' }}>Question {currentQ + 1} / {questions.length}</p>
              <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', fontSize: '1.1rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                {questions[currentQ].question}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(questions[currentQ].choices ?? []).map((choice, ci) => (
                  <button key={ci} onClick={() => setAnswers([...answers, ci])} style={{
                    padding: '12px 16px', background: 'var(--bg3)',
                    border: '1px solid var(--border)', borderRadius: 10,
                    color: 'var(--text)', fontSize: 14, textAlign: 'left', cursor: 'pointer',
                    transition: 'border-color .2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span style={{ color: 'var(--muted)', marginRight: 8 }}>{['A', 'B', 'C', 'D', '?'][ci]}.</span>
                    {choice}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '.5rem' }}>Évaluation terminée !</h3>
              <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                {answers.filter((a, i) => questions[i] && a === questions[i].answerIndex).length} / {questions.length} bonnes réponses
              </p>
              <button onClick={handleFinishAssess} style={{
                padding: '12px 28px', background: 'var(--purple)', border: 'none',
                borderRadius: 10, color: '#fff', fontFamily: 'var(--font-head)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                Générer mon cours personnalisé →
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Vue nouveau cours ──────────────────────────────────────────────────────
  if (step === 'new') {
    return (
      <div className="fade-in" style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1.5rem' }}>
        <button onClick={() => setStep('list')} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none',
          border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', marginBottom: '1.5rem',
        }}>
          <ArrowLeft size={14} /> Retour
        </button>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', color: 'var(--white)', marginBottom: '.4rem' }}>
            ✨ Nouveau cours
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: '1.5rem', lineHeight: 1.6 }}>
            L'IA va d'abord évaluer ton niveau avec 5 questions, puis générer un cours complet adapté.
          </p>
          <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            Que veux-tu apprendre ?
          </label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStartNew()}
            placeholder="ex: Cybersécurité, Python, Histoire…"
            style={{
              width: '100%', padding: '12px 14px', background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: 10,
              color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
              boxSizing: 'border-box', marginBottom: '1rem',
            }}
          />
          {/* Suggestions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1.25rem' }}>
            {SUGGESTED.map(s => (
              <button key={s} onClick={() => setSubject(s)} style={{
                padding: '5px 12px', background: subject === s ? 'var(--purple)' : 'var(--bg3)',
                border: `1px solid ${subject === s ? 'var(--purple)' : 'var(--border)'}`,
                borderRadius: 20, color: subject === s ? '#fff' : 'var(--muted)', fontSize: 12, cursor: 'pointer',
              }}>
                {s}
              </button>
            ))}
          </div>
          {error && (
            <div style={{ padding: '8px 12px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          <button onClick={handleStartNew} disabled={!subject.trim()} style={{
            width: '100%', padding: '12px', background: subject.trim() ? 'var(--purple)' : 'var(--bg3)',
            border: 'none', borderRadius: 10, color: '#fff',
            fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 600,
            cursor: subject.trim() ? 'pointer' : 'not-allowed',
          }}>
            Évaluer mon niveau →
          </button>
        </div>
      </div>
    )
  }

  // ── Vue liste des cours ────────────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--white)' }}>
          🎓 Mes Cours
        </h2>
        <button onClick={() => { setSubject(''); setQuestions([]); setAnswers([]); setLevel(null); setStep('new') }} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', background: 'var(--purple)',
          border: 'none', borderRadius: 8, color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          + Nouveau cours
        </button>
      </div>

      {courses.length === 0 ? (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '3rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
          <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '.5rem' }}>Aucun cours encore</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Dis à l'IA ce que tu veux apprendre — elle évalue ton niveau et génère un cours complet avec modules et exercices.
          </p>
          <button onClick={() => { setSubject(''); setQuestions([]); setAnswers([]); setLevel(null); setStep('new') }} style={{
            padding: '12px 28px', background: 'var(--purple)', border: 'none',
            borderRadius: 10, color: '#fff', fontFamily: 'var(--font-head)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            ✨ Créer mon premier cours
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {courses.map(course => (
            <div key={course.id}
              onClick={() => openCourse(course)}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '1.5rem', cursor: 'pointer',
                transition: 'border-color .2s, transform .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                <BookOpen size={24} style={{ color: 'var(--purple)' }} />
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg3)', color: 'var(--muted)' }}>
                  {LEVEL_LABELS[course.level]}
                </span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: '.4rem' }}>
                {course.title}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                {course.description}
              </p>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                📚 {course.total_modules} modules · {new Date(course.created_at).toLocaleDateString('fr-CA')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
