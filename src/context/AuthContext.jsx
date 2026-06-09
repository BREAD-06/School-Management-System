import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { AuthContext } from './AuthContextInstance.js'

// This file exports ONLY the AuthProvider component so that Vite Fast Refresh
// can handle it without the "incompatible export" warning that would otherwise
// force a full page reload on every save.
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

    // 1) On app load, ALWAYS restore any persisted session before rendering
    //    routes. `loading` stays true (ProtectedRoute shows a spinner) until
    //    BOTH the session and its role are resolved — otherwise routes could
    //    briefly see a valid session with a null role and wrongly redirect to
    //    /login (this was the "logged out on reload" bug).
    ;(async () => {
      try {
        const { data: { session: existing } } = await supabase.auth.getSession()
        if (!active) return
        setSession(existing)
        await fetchRole(existing?.user?.id)
      } catch {
        // Supabase unreachable — treat as logged out.
      } finally {
        if (active) setLoading(false)
      }
    })()

    // 2) React to later auth changes (login, logout, token refresh).
    //    `loading` is intentionally NOT touched here — initial loading is owned
    //    solely by the restore above.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return
      setSession(newSession)

      // CRITICAL: never `await` other Supabase calls directly inside this
      // callback. supabase-js (v2) holds an internal auth lock while invoking
      // it; awaiting another supabase call here (supabase.from / auth.*, which
      // need the same lock) deadlocks the client and hangs EVERY subsequent
      // request. Defer the follow-up queries so they run AFTER the lock releases.
      setTimeout(() => {
        if (!active) return
        fetchRole(newSession?.user?.id)
      }, 0)
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
