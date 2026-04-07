'use client'

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { User, AuthContextType } from './types'
import { toFrontendRole } from './types'
import { getSupabase } from '@/lib/supabase/client'
import { apiClient, ApiError, setAccessToken } from '@/lib/api/client'
import { requestNotificationPermission, removeFcmToken } from '@/lib/firebase/messaging'
import type { Session } from '@supabase/supabase-js'

/**
 * Auth Context
 *
 * Provides authentication state and methods throughout the app.
 * Uses Supabase Auth for session management and the NestJS backend for user profile data.
 * Falls back to Supabase session data when backend is unavailable.
 */
export const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

/** Map a backend user response to our frontend User type */
function mapBackendUser(data: Record<string, unknown>): User {
  const backendRole = (data.role as string) || 'TENANT'
  const firstName = (data.firstName as string) || ''
  const lastName = (data.lastName as string) || ''

  return {
    id: data.id as string,
    email: data.email as string,
    name: firstName && lastName ? `${firstName} ${lastName}` : (data.email as string),
    firstName,
    lastName,
    phone: (data.phone as string) || undefined,
    avatar: (data.avatarUrl as string) || undefined,
    role: toFrontendRole(backendRole as import('./types').BackendRole),
    backendRole: backendRole as import('./types').BackendRole,
    onboardingCompleted: !!data.firstName,
  }
}

/** Build a User from Supabase session when backend is unavailable */
function mapSupabaseUser(session: Session): User {
  const supabaseUser = session.user
  const meta = supabaseUser.user_metadata || {}
  const fullName = meta.full_name || meta.name || ''
  const email = supabaseUser.email || ''

  return {
    id: supabaseUser.id,
    email,
    name: fullName || email,
    firstName: meta.first_name || fullName.split(' ')[0] || '',
    lastName: meta.last_name || fullName.split(' ').slice(1).join(' ') || '',
    avatar: meta.avatar_url || meta.picture || undefined,
    role: 'tenant',
    onboardingCompleted: false,
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)

  /** Fetch the user profile from the backend, fallback to Supabase session */
  const fetchUser = useCallback(async (session?: Session | null): Promise<User | null> => {
    // Use token directly from session to avoid calling getSession() again (can deadlock during init)
    const token = session?.access_token
    try {
      const data = await apiClient.get<Record<string, unknown>>('/users/me', token)
      return mapBackendUser(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null
      }
      // Backend unavailable — fallback to Supabase session data
      if (session) {
        return mapSupabaseUser(session)
      }
      console.error('[Auth] Error fetching user profile:', err)
      return null
    }
  }, [])

  /** Refresh user data from backend (e.g. after onboarding) */
  const refreshUser = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setAccessToken(session.access_token)
    }
    const userData = await fetchUser(session)
    setUser(userData)
  }, [fetchUser])

  /** Check MFA assurance level and update mfaRequired state */
  const checkMfaLevel = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal?.currentLevel === 'aal1') {
        setMfaRequired(true)
      } else if (aal?.currentLevel === 'aal2') {
        setMfaRequired(false)
      }
    } catch {
      // MFA not available — ignore
    }
  }, [])

  const setMfaVerified = useCallback(() => {
    setMfaRequired(false)
  }, [])

  // Initialize auth on mount
  useEffect(() => {
    const supabase = getSupabase()

    // If Supabase is not configured, skip auth initialization
    if (!supabase) {
      console.warn('[Auth] Supabase not configured — running without authentication')
      setIsLoading(false)
      return
    }

    // Load initial session
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('[Auth] getSession result:', { hasSession: !!session, error, userId: session?.user?.id })
        if (session) {
          setAccessToken(session.access_token)
          const userData = await fetchUser(session)
          console.log('[Auth] fetchUser result:', userData)
          setUser(userData)
          await checkMfaLevel()
          // Register FCM token on initial session load
          if (userData?.onboardingCompleted) {
            requestNotificationPermission().catch(() => {})
          }
        } else {
          console.log('[Auth] No session found - user not logged in')
        }
      } catch (err) {
        console.error('[Auth] Error initializing auth session:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initSession()

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange:', event, { hasSession: !!session })
        if (event === 'SIGNED_IN' && session) {
          setAccessToken(session.access_token)
          const userData = await fetchUser(session)
          setUser(userData)
          setIsLoading(false)
          await checkMfaLevel()
          // Register FCM token after successful login with completed onboarding
          if (userData?.onboardingCompleted) {
            requestNotificationPermission().catch(() => {})
          }
        } else if (event === 'SIGNED_OUT') {
          setAccessToken(null)
          setUser(null)
          setMfaRequired(false)
          setIsLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setAccessToken(session.access_token)
          const userData = await fetchUser(session)
          setUser(userData)
          await checkMfaLevel()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUser, checkMfaLevel])

  /** Sign in with Google OAuth via Supabase */
  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      throw error
    }
  }, [])

  /** Sign in with email and password via Supabase */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  /** Sign out and clear state */
  const signOut = useCallback(async () => {
    // Remove FCM token before signing out (while we still have auth)
    await removeFcmToken().catch(() => {})
    const supabase = getSupabase()
    if (supabase) {
      await supabase.auth.signOut()
    }
    setAccessToken(null)
    setUser(null)
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    mfaRequired,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    logout: signOut,
    refreshUser,
    setMfaVerified,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
