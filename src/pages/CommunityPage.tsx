import { useState, useEffect, useRef } from 'react'
import { Hash, Users, Send, Trophy, Zap, FileText, MessageCircle, ArrowLeft, Plus } from 'lucide-react'
import {
  supabase,
  getAutodidacteCommunities, getCommunityChannels, getChannelMessages,
  sendMessage, joinCommunity, leaveCommunity, getCommunityLeaderboard,
  getChallenges, generateChallenge, submitChallenge,
  type Classroom, type Challenge, getTeacherClassrooms, createSchoolCommunity,
} from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Community, CommunityChannel, CommunityMessage, AppMode } from '../types'

const channelIcon = (type: string) => {
  if (type === 'resources')   return <FileText size={15} />
  if (type === 'leaderboard') return <Trophy size={15} />
  if (type === 'challenges')  return <Zap size={15} />
  return <Hash size={15} />
}

interface Props { appMode: AppMode }

export function CommunityPage({ appMode }: Props) {
  const { user, profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin'
  const isTeacher    = profile?.role === 'teacher'

  const hasAccess = isSuperadmin
    || appMode === 'school'
    || ['autodidacte', 'pro', 'teacher'].includes(profile?.plan ?? '')

  const [communities,  setCommunities]  = useState<Community[]>([])
  const [activeCom,    setActiveCom]    = useState<Community | null>(null)
  const [channels,     setChannels]     = useState<CommunityChannel[]>([])
  const [activeChannel,setActiveChannel]= useState<CommunityChannel | null>(null)
  const [messages,     setMessages]     = useState<CommunityMessage[]>([])
  const [leaderboard,  setLeaderboard]  = useState<{ name: string; score: number; total: number }[]>([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [joining,      setJoining]      = useState<string | null>(null)
  const [classrooms,   setClassrooms]   = useState<Classroom[]>([])
  const [challenges,   setChallenges]   = useState<Challenge[]>([])
  const [challengeInput, setChallengeInput] = useState('')
  const [generatingChallenge, setGeneratingChallenge] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || !hasAccess) return
    loadCommunities()
    if (appMode === 'school' && isTeacher) {
      getTeacherClassrooms(user.id).then(setClassrooms)
    }
  }, [user, appMode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll messages every 4s quand un channel est ouvert
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (activeChannel) {
      pollRef.current = setInterval(() => refreshMessages(activeChannel.id), 4000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeChannel])

  const loadCommunities = async () => {
    if (!user) return
    if (appMode === 'school') {
      // Pour les élèves: récupérer leur classe et sa communauté
      if (!isTeacher && profile?.class_code) {
        // La communauté scolaire est liée à la classe — géré au niveau TeacherDashboard
      }
      // Charger toutes les communautés scolaires accessibles
      const { data } = await supabase
        .from('communities')
        .select('*')
        .eq('type', 'school')
      if (data) setCommunities(data as Community[])
    } else {
      const list = await getAutodidacteCommunities(user.id)
      setCommunities(list)
    }
  }

  const openCommunity = async (com: Community) => {
    setActiveCom(com)
    setActiveChannel(null)
    setMessages([])
    const chs = await getCommunityChannels(com.id)
    setChannels(chs)
    if (chs.length > 0) openChannel(chs[0])

    if (com.type === 'autodidacte') {
      const lb = await getCommunityLeaderboard(com.id)
      setLeaderboard(lb)
    }
  }

  const openChannel = async (ch: CommunityChannel) => {
    setActiveChannel(ch)
    setMessages([])
    if (ch.type === 'challenges' && activeCom) {
      const ch_list = await getChallenges(activeCom.id)
      setChallenges(ch_list)
    } else if (ch.type !== 'leaderboard') {
      const msgs = await getChannelMessages(ch.id)
      setMessages(msgs)
    }
  }

  const handleGenerateChallenge = async (level: string) => {
    if (!activeCom) return
    setGeneratingChallenge(true)
    try {
      const ch = await generateChallenge(activeCom.id, activeCom.topic ?? activeCom.name, level)
      setChallenges(prev => [ch, ...prev])
    } finally {
      setGeneratingChallenge(false)
    }
  }

  const handleSubmitChallenge = async (challengeId: string) => {
    if (!user || !challengeInput.trim()) return
    await submitChallenge(challengeId, user.id, challengeInput.trim())
    setChallengeInput('')
  }

  const refreshMessages = async (channelId: string) => {
    const msgs = await getChannelMessages(channelId)
    setMessages(msgs)
  }

  const handleJoin = async (com: Community) => {
    if (!user) return
    setJoining(com.id)
    try {
      await joinCommunity(user.id, com.id)
      setCommunities(prev => prev.map(c => c.id === com.id ? { ...c, is_member: true } : c))
      openCommunity({ ...com, is_member: true })
    } finally {
      setJoining(null)
    }
  }

  const handleLeave = async () => {
    if (!user || !activeCom) return
    await leaveCommunity(user.id, activeCom.id)
    setCommunities(prev => prev.map(c => c.id === activeCom.id ? { ...c, is_member: false } : c))
    setActiveCom(null)
  }

  const handleSend = async () => {
    if (!user || !activeChannel || !input.trim() || loading) return
    setLoading(true)
    try {
      await sendMessage(activeChannel.id, user.id, input.trim())
      setInput('')
      await refreshMessages(activeChannel.id)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleCreateSchoolCommunity = async (classroom: Classroom) => {
    const com = await createSchoolCommunity(classroom.id, classroom.name)
    setCommunities(prev => [...prev, com])
    openCommunity(com)
  }

  if (!hasAccess) {
    return (
      <div className="fade-in" style={{ maxWidth: 560, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏘️</div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', color: 'var(--white)', marginBottom: '.5rem' }}>
          Communautés LearnI
        </h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Les communautés sont disponibles avec le plan <strong style={{ color: '#a78bfa' }}>Autodidacte</strong> ou en mode Établissement scolaire.
        </p>
      </div>
    )
  }

  // ── Vue liste des communautés ──────────────────────────────────────────────
  if (!activeCom) {
    return (
      <div className="fade-in" style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--white)', marginBottom: '.4rem' }}>
          {appMode === 'school' ? '🏫 Communautés Scolaires' : '🏘️ Communautés'}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '2rem' }}>
          {appMode === 'school'
            ? 'Espace de discussion pour votre classe — partagez, posez des questions, collaborez.'
            : 'Rejoignez des groupes d\'étude par matière. Discutez, partagez vos notes, défiez les autres.'}
        </p>

        {/* Créer communauté scolaire (prof uniquement) */}
        {appMode === 'school' && isTeacher && classrooms.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: '.5rem', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>
              Créer une communauté pour une classe
            </p>
            <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
              {classrooms
                .filter(cl => !communities.find(com => com.classroom_id === cl.id))
                .map(cl => (
                  <button key={cl.id} onClick={() => handleCreateSchoolCommunity(cl)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', background: 'var(--bg2)',
                    border: '1px dashed var(--border)', borderRadius: 8,
                    color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
                  }}>
                    <Plus size={14} /> {cl.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {communities.map(com => (
            <div key={com.id} style={{
              background: 'var(--bg2)', border: `1px solid ${com.is_member ? 'var(--purple)' : 'var(--border)'}`,
              borderRadius: 14, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.75rem' }}>{com.emoji}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '1rem' }}>{com.name}</div>
                  {com.is_member && <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>● Membre</span>}
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, flex: 1 }}>{com.description}</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)' }}>
                  <Users size={12} /> {com.member_count} membres
                </span>
                <div style={{ flex: 1 }} />
                {com.is_member ? (
                  <button onClick={() => openCommunity(com)} style={{
                    padding: '7px 16px', background: 'var(--purple)', border: 'none',
                    borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Ouvrir
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoin(com)}
                    disabled={joining === com.id}
                    style={{
                      padding: '7px 16px', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: 8,
                      color: 'var(--text)', fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {joining === com.id ? '…' : 'Rejoindre'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Vue communauté (Discord-like) ──────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>

      {/* ── Sidebar canaux ──────────────────────────────────────────────── */}
      <aside style={{
        width: 240, flexShrink: 0, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header communauté */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setActiveCom(null)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', marginBottom: 8,
          }}>
            <ArrowLeft size={14} /> Toutes les communautés
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>{activeCom.emoji}</span>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '0.95rem' }}>
              {activeCom.name}
            </span>
          </div>
        </div>

        {/* Liste des canaux */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '.5rem' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '8px 8px 4px' }}>
            Canaux
          </p>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => openChannel(ch)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 6, border: 'none',
              background: activeChannel?.id === ch.id ? 'var(--bg3)' : 'transparent',
              color: activeChannel?.id === ch.id ? 'var(--text)' : 'var(--muted)',
              fontSize: 14, cursor: 'pointer', textAlign: 'left',
            }}>
              {channelIcon(ch.type)} {ch.name}
            </button>
          ))}
        </div>

        {/* Quitter */}
        {activeCom.type === 'autodidacte' && (
          <button onClick={handleLeave} style={{
            margin: '.75rem', padding: '8px', background: 'transparent',
            border: '1px solid #3a1515', borderRadius: 8,
            color: '#f87171', fontSize: 12, cursor: 'pointer',
          }}>
            Quitter la communauté
          </button>
        )}
      </aside>

      {/* ── Zone principale ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header canal */}
        {activeChannel && (
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ color: 'var(--muted)' }}>{channelIcon(activeChannel.type)}</span>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--white)', fontSize: 14 }}>
              {activeChannel.name}
            </span>
            {activeChannel.description && (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>— {activeChannel.description}</span>
            )}
          </div>
        )}

        {/* Contenu canal */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>

          {/* Challenges */}
          {activeChannel?.type === 'challenges' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)' }}>⚡ Challenge de la semaine</h3>
                {(isTeacher || isSuperadmin) && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['debutant', 'intermediaire', 'expert'].map(lvl => (
                      <button key={lvl} onClick={() => handleGenerateChallenge(lvl)} disabled={generatingChallenge} style={{ padding: '6px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}>
                        {generatingChallenge ? '…' : `+ ${lvl}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {challenges.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Aucun challenge cette semaine — bientôt !</p>
              ) : challenges.map(ch => {
                const daysLeft = Math.max(0, Math.ceil((new Date(ch.expires_at).getTime() - Date.now()) / 86400000))
                const levelColor = ch.level === 'debutant' ? 'var(--green)' : ch.level === 'intermediaire' ? 'var(--gold)' : 'var(--red)'
                return (
                  <div key={ch.id} style={{ background: 'var(--bg2)', border: `1px solid ${levelColor}`, borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>⚡</span>
                      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', flex: 1 }}>{ch.title}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg3)', color: levelColor, fontWeight: 600 }}>{ch.level}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: '.75rem' }}>{ch.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>⏰ {daysLeft} jours restants</span>
                      <input value={challengeInput} onChange={e => setChallengeInput(e.target.value)} placeholder="Partage ta solution..." style={{ flex: 1, padding: '7px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)' }} />
                      <button onClick={() => handleSubmitChallenge(ch.id)} style={{ padding: '7px 14px', background: 'var(--purple)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Partager</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Classement */}
          {activeChannel?.type === 'leaderboard' && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--white)', marginBottom: '1rem' }}>🏆 Classement</h3>
              {leaderboard.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Pas encore de classement — complétez des quiz !</p>
              ) : leaderboard.map((entry, i) => (
                <div key={entry.name} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: i < 3 ? 'var(--bg2)' : 'transparent',
                  border: i < 3 ? `1px solid ${['#f5a623','#aaa','#b87333'][i]}` : 'none',
                  borderRadius: 10, marginBottom: 6,
                }}>
                  <span style={{ width: 28, fontFamily: 'var(--font-head)', fontWeight: 700, color: ['#f5a623','#aaa','#b87333'][i] ?? 'var(--muted)', fontSize: 14 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span style={{ flex: 1, color: 'var(--text)', fontSize: 14 }}>{entry.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>{entry.total} quiz</span>
                  <span style={{
                    fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14,
                    color: entry.score >= 80 ? 'var(--green)' : entry.score >= 60 ? 'var(--gold)' : 'var(--red)',
                  }}>
                    {entry.score}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          {activeChannel?.type !== 'leaderboard' && (
            <>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--muted)' }}>
                  <MessageCircle size={40} style={{ marginBottom: '1rem', opacity: .4 }} />
                  <p style={{ fontSize: 14 }}>Soyez le premier à écrire dans #{activeChannel?.name}</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', gap: 10, marginBottom: '1rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: msg.author_role === 'teacher' ? 'var(--purple)' : msg.author_role === 'superadmin' ? 'var(--red)' : 'var(--bg3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff',
                  }}>
                    {msg.author_name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--white)' }}>{msg.author_name}</span>
                      {msg.author_role === 'teacher' && (
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#2d1b69', color: '#a78bfa', fontWeight: 700 }}>PROF</span>
                      )}
                      {msg.author_role === 'superadmin' && (
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#2a0f0f', color: '#f87171', fontWeight: 700 }}>ADMIN</span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </div>
                    {msg.file_name && (
                      <a href={msg.file_url ?? '#'} target="_blank" rel="noreferrer" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6,
                        padding: '6px 12px', background: 'var(--bg3)', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text)', fontSize: 12, textDecoration: 'none',
                      }}>
                        <FileText size={13} /> {msg.file_name}
                      </a>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input message */}
        {activeChannel && activeChannel.type !== 'leaderboard' && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            {/* Restriction ressources: profs seulement */}
            {activeChannel.type === 'resources' && !isTeacher && !isSuperadmin ? (
              <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                📎 Seuls les professeurs peuvent publier des ressources dans ce canal.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={`Écrire dans #${activeChannel.name}…`}
                  rows={2}
                  style={{
                    flex: 1, padding: '10px 14px', background: 'var(--bg2)',
                    border: '1px solid var(--border)', borderRadius: 10,
                    color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', resize: 'none',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: input.trim() && !loading ? 'var(--purple)' : 'var(--bg3)',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
