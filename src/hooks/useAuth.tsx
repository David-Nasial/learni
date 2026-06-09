// ─── Hook Auth — Session utilisateur globale ──────────────────────────────────
import { useState, useEffect, createContext, useContext, type ReactNode, type JSX } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, getProfile, type Profile } from '../utils/supabase'

interface AuthContextType {
  user:           User | null
  profile:        Profile | null
  loading:        boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user:           null,
  profile:        null,
  loading:        true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (u: User): Promise<void> => {
    const p = await getProfile(u.id)
    setProfile(p)
  }

  const refreshProfile = async (): Promise<void> => {
    if (user) await loadProfile(user)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) loadProfile(u).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadProfile(u)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)