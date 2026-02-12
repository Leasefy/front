'use client'

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { User, AuthContextType } from './types'
import { toFrontendRole } from './types'
import { getSupabase } from '@/lib/supabase/client'
import { apiClient, ApiError } from '@/lib/api/client'

/**
 * Auth Context
 *
 * Provides authentication state and methods throughout the app.
 * Uses Supabase Auth for session management and the NestJS backend for user profile data.
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /** Fetch the user profile from the backend */
  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const data = await apiClient.get<Record<string, unknown>>('/users/me')
      return mapBackendUser(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null
      }
      console.error('Error fetching user profile:', err)
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
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const userData = await fetchUser()
          setUser(userData)
        }
      } catch (err) {
        console.error('Error initializing auth session:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initSession()

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const userData = await fetchUser()
          setUser(userData)
          setIsLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Session refreshed, re-fetch user profile in case it changed
          const userData = await fetchUser()
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
