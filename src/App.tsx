// ─── App.tsx — LearnI — version corrigée avec Auth + AppMode ─────────────────
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Navbar }           from './components/Navbar'
import { Sidebar }          from './components/Sidebar'
import { Paywall }          from './components/Paywall'
import { HomePage }         from './pages/HomePage'
import { UploadPage }       from './pages/UploadPage'
import { GeneratingPage }   from './pages/GeneratingPage'
import { QuizPage }         from './pages/QuizPage'
import { ResultsPage }      from './pages/ResultsPage'
import { HistoryPage }      from './pages/HistoryPage'
import { PricingPage }      from './pages/PricingPage'
import { LoginPage }        from './pages/LoginPage'
import { TeacherDashboard } from './pages/TeacherDashboard'
import { TutorPage }         from './pages/TutorPage'
import { StudyPlanPage }     from './pages/StudyPlanPage'
import { CoursesPage }       from './pages/CoursesPage'
import { CommunityPage }     from './pages/CommunityPage'
import { FlashcardsPage }    from './pages/FlashcardsPage'
import { CartablePage }      from './pages/CartablePage'
import { StudentDashboard }   from './pages/StudentDashboard'
import { OnboardingModal }    from './components/OnboardingModal'
import { useLocalStorage }    from './hooks/useLocalStorage'
import { signOut, saveResultToCloud } from './utils/supabase'
import type {
  Page, Plan, AppMode, QuizResult, QuizSession,
  GenerateOptions, Question,
} from './types'

// ─── Wrapper racine avec AuthProvider ────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

// ─── Écran de choix du mode (première visite) ─────────────────────────────────
function ModeSelector({ onSelect }: { onSelect: (m: AppMode) => void }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
    }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🍁</div>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--white)', marginBottom: '.5rem' }}>
          Bienvenue sur LearnI
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: '2.5rem', lineHeight: 1.6 }}>
          Pour personnaliser votre expérience, dites-nous comment vous allez utiliser LearnI.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button onClick={() => onSelect('personal')} style={{
            padding: '2rem 1.25rem', background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 16,
            color: 'var(--text)', textAlign: 'left', cursor: 'pointer',
            transition: 'border-color .2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--red)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>🎓</div>
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: '.4rem' }}>
              Usage personnel
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              J'étudie seul et je veux réviser mes cours avec l'IA.
            </p>
          </button>

          <button onClick={() => onSelect('school')} style={{
            padding: '2rem 1.25rem', background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 16,
            color: 'var(--text)', textAlign: 'left', cursor: 'pointer',
            transition: 'border-color .2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>🏫</div>
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: '.4rem' }}>
              Établissement scolaire
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Je suis prof ou admin et je veux gérer des classes et des élèves.
            </p>
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#555', marginTop: '1.25rem' }}>
          Vous pourrez changer ce choix dans les paramètres.
        </p>
      </div>
    </div>
  )
}

// ─── App principale ───────────────────────────────────────────────────────────
function AppInner() {
  const { user, profile, loading } = useAuth()

  const [appMode, setAppMode]       = useLocalStorage<AppMode | null>('learni_mode', null)
  const [page, setPage]             = useState<Page>('home')
  const [sidebarOpen, setSidebar]   = useState(false)
  const [paywallFeature, setPaywall]= useState<string | null>(null)
  const [plan, setPlan]             = useLocalStorage<Plan>('learni_plan', 'free')
  const [results, setResults]       = useLocalStorage<QuizResult[]>('learni_results', [])
  const [quizCountToday, setCount]  = useLocalStorage<number>('learni_count', 0)
  const [quizCountDate, setCountDate] = useLocalStorage<string>('learni_count_date', '')

  const [generateOpts, setGenerateOpts] = useState<GenerateOptions | null>(null)
  const [session, setSession]           = useState<QuizSession | null>(null)
  const [finalAnswers, setFinalAnswers] = useState<(number | null)[]>([])
  const [genError, setGenError]         = useState('')

  // Onboarding
  const [onboardingType, setOnboarding] = useState<'first' | Plan | null>(null)
  const [seenOnboarding, setSeenOnboarding] = useLocalStorage<string[]>('learni_onboarding_seen', [])

  // Sync plan depuis profil Supabase
  useEffect(() => {
    if (profile?.plan) setPlan(profile.plan as Plan)
  }, [profile])

  // Déclencher onboarding première connexion
  useEffect(() => {
    if (user && !loading && !seenOnboarding.includes('first')) {
      setOnboarding('first')
    }
  }, [user, loading])

  // Déclencher onboarding après achat d'un plan
  useEffect(() => {
    if (plan && plan !== 'free' && !seenOnboarding.includes(plan)) {
      // Petit délai pour laisser le dashboard s'afficher d'abord
      const t = setTimeout(() => setOnboarding(plan), 800)
      return () => clearTimeout(t)
    }
  }, [plan])

  // Retour depuis Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => window.location.reload(), 2000)
    }
  }, [])

  const closeOnboarding = () => {
    if (onboardingType) {
      setSeenOnboarding(prev => prev.includes(onboardingType) ? prev : [...prev, onboardingType])
    }
    setOnboarding(null)
  }

  const today = new Date().toLocaleDateString('fr-CA')

  // Première visite → afficher le sélecteur de mode
  if (loading) return null
  if (appMode === null) {
    return <ModeSelector onSelect={(m) => setAppMode(m)} />
  }

  const navigate = (p: Page) => { setPage(p); setGenError('') }

  const isSuperadmin = profile?.role === 'superadmin'

  const handleGenerate = (opts: GenerateOptions) => {
    const count = quizCountDate === today ? quizCountToday : 0
    const limit = plan === 'free' ? 2 : plan === 'starter' ? 5 : Infinity
    if (!isSuperadmin && count >= limit) { setPaywall('limit'); return }
    setGenerateOpts(opts)
    if (quizCountDate !== today) { setCountDate(today); setCount(1) }
    else setCount(count + 1)
    navigate('generating')
  }

  const handleQuestionsReady = (questions: Question[]) => {
    setSession({
      id: `s-${Date.now()}`,
      title: generateOpts?.documentTitle ?? 'Quiz',
      questions,
      currentIndex: 0,
      answers: Array(questions.length).fill(null),
      startedAt: new Date(),
    })
    navigate('quiz')
  }

  const handleFinish = async (answers: (number | null)[]) => {
    if (!session) return
    setFinalAnswers(answers)
    const correct = answers.filter((a, i) => a === session.questions[i].answerIndex).length
    const score   = Math.round((correct / session.questions.length) * 100)
    const result: QuizResult = {
      id: `r-${Date.now()}`,
      title: session.title,
      score, correct,
      total: session.questions.length,
      date: new Date().toLocaleDateString('fr-CA'),
      durationSeconds: Math.round((Date.now() - session.startedAt.getTime()) / 1000),
    }
    setResults([result, ...results])
    if (user) {
      try { await saveResultToCloud(user.id, result) } catch { /* offline */ }
    }
    navigate('results')
  }

  const handleRestart = () => {
    if (!session) return
    setSession({ ...session, currentIndex: 0, answers: Array(session.questions.length).fill(null), startedAt: new Date() })
    navigate('quiz')
  }

    const showPaywall = (feature: string) => {
    if (isSuperadmin) return  // superadmin has access to everything
    setPaywall(feature)
  }

  const handleLogout = async () => {
    await signOut()
    setPlan('free')
    navigate('home')
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <HomePage onNavigate={navigate} onUpgrade={() => showPaywall('sub')} user={user} profile={profile} plan={plan} appMode={appMode} />

      case 'upload':
        return (
          <>
            {genError && (
              <div style={{ maxWidth: 700, margin: '1rem auto 0', padding: '0 1.5rem' }}>
                <div style={{ padding: '12px 16px', background: '#2a0f0f', border: '1px solid var(--red)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>
                  ❌ {genError}
                </div>
              </div>
            )}
            <UploadPage onGenerate={handleGenerate} />
          </>
        )

      case 'generating':
        return generateOpts
          ? <GeneratingPage options={generateOpts} onDone={handleQuestionsReady} onError={(msg) => { setGenError(msg); navigate('upload') }} />
          : null

      case 'quiz':
        return session ? <QuizPage session={session} onFinish={handleFinish} /> : null

      case 'results':
        return session
          ? <ResultsPage session={session} answers={finalAnswers} onNavigate={navigate} onRestart={handleRestart} onUpgrade={() => showPaywall('sub')} />
          : null

      case 'history':
        return <HistoryPage results={results} onUpgrade={() => showPaywall('sub')} />

      case 'pricing':
        return <PricingPage onUpgrade={(p) => { setPlan(p as Plan); setPaywall(null) } } onTeacher={() => showPaywall('teacher')} appMode={appMode} onLogin={() => navigate('login')} />

      case 'login':
        return <LoginPage onSuccess={() => navigate('home')} appMode={appMode} />

      // Pages école — seulement si mode school
      case 'teacher':
        if (appMode !== 'school') { navigate('home'); return null }
        return user
          ? <TeacherDashboard />
          : <LoginPage onSuccess={() => navigate('teacher')} initialMode="login" appMode={appMode} />

      case 'student':
        if (appMode !== 'school') { navigate('home'); return null }
        return user
          ? <StudentDashboard />
          : <LoginPage onSuccess={() => navigate('student')} initialMode="login" appMode={appMode} />

      case 'tutor':
        return <TutorPage />

      case 'study':
        return <StudyPlanPage />

      case 'courses':
        return <CoursesPage />

      case 'community':
        return <CommunityPage appMode={appMode} />

      case 'flashcards':
        return <FlashcardsPage />

      case 'cartable':
        return <CartablePage />

      default:
        return null
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar
        onMenuClick={() => setSidebar(true)}
        plan={plan}
        user={user}
        onUpgradeClick={() => showPaywall('sub')}
        onLoginClick={() => navigate('login')}
        onLogoutClick={handleLogout}
        onProfileClick={() => navigate(profile?.role === 'teacher' ? 'teacher' : 'student')}
      />
      <Sidebar
        open={sidebarOpen}
        currentPage={page}
        plan={plan}
        appMode={appMode}
        role={profile?.role ?? 'student'}
        isLoggedIn={!!user}
        onNavigate={navigate}
        onProFeature={(f) => { setSidebar(false); showPaywall(f) }}
        onClose={() => setSidebar(false)}
        onChangeMode={() => { setAppMode(null); setSidebar(false) }}
      />
      <main style={{ paddingBottom: '3rem' }}>{renderPage()}</main>
      <Paywall
        feature={paywallFeature}
        onClose={() => setPaywall(null)}
        isLoggedIn={!!user}
        onLogin={() => { setPaywall(null); navigate('login') }}
      />
      {onboardingType && (
        <OnboardingModal
          type={onboardingType}
          onClose={closeOnboarding}
          onNavigate={(p) => { closeOnboarding(); navigate(p) }}
        />
      )}
    </div>
  )
}