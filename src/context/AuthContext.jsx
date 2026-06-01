import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // Look up the signed-in user's role from the user_roles table.
  const fetchRole = useCallback(async (userId) => {
    if (!userId) {
      setRole(null)
      return null
    }
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch user role:', error.message)
      setRole(null)
      return null
    }
    const r = data?.role ?? null
    setRole(r)
    return r
  }, [])

  useEffect(() => {
    let active = true

    // Initial session load.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await fetchRole(data.session?.user?.id)
      setLoading(false)
    })

    // React to auth changes (login, logout, token refresh).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return
      setSession(newSession)
      await fetchRole(newSession?.user?.id)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchRole])

  // Returns { role } on success or throws on failure.
  const signIn = useCallback(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      const r = await fetchRole(data.user?.id)
      return { role: r }
    },
    [fetchRole],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setRole(null)
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    role,
    loading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
