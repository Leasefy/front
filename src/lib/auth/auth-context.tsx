'use client'

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { User, AuthContextType } from './types'
import { toFrontendRole } from './types'
import { getSupabase } from '@/lib/supabase/client'
import { apiClient, ApiError } from '@/lib/api/client'
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
    const userData = await fetchUser()
    setUser(userData)
  }, [fetchUser])

  // Initialize auth on mount
  useEffect(() => {
    const supabase = getSupabase()

    // Load initial session
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('[Auth] getSession result:', { hasSession: !!session, error, userId: session?.user?.id })
        if (session) {
          const userData = await fetchUser(session)
          console.log('[Auth] fetchUser result:', userData)
          setUser(userData)
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
          const userData = await fetchUser(session)
          setUser(userData)
          setIsLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          const userData = await fetchUser(session)
          setUser(userData)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUser])

  /** Sign in with Google OAuth via Supabase */
  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase()
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

  /** Sign out and clear state */
  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signInWithGoogle,
    signOut,
    logout: signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
