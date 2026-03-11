'use client'

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { User, AuthContextType, Agency, AgencyMemberRole } from './types'
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
  const [agency, setAgencyState] = useState<Agency | null>(null)
  const [agencyRole, setAgencyRole] = useState<AgencyMemberRole | null>(null)

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

  /** Set the agency and role in context (called after registration or when user loads) */
  const setAgency = useCallback((agencyData: Agency | null, role: AgencyMemberRole | null) => {
    setAgencyState(agencyData)
    setAgencyRole(role)
  }, [])

  /** Fetch agency membership for agency/agent roles */
  const fetchAgency = useCallback(async (token?: string): Promise<{ agency: Agency | null; role: AgencyMemberRole | null }> => {
    try {
      const data = await apiClient.get<{ agency: Agency; role: AgencyMemberRole }>('/inmobiliaria/me/agency', token)
      return { agency: data.agency, role: data.role }
    } catch {
      // User may not belong to an agency yet (e.g. just registered)
      return { agency: null, role: null }
    }
  }, [])

  /** Refresh user data from backend (e.g. after onboarding) */
  const refreshUser = useCallback(async () => {
    // Use the already-stored token to avoid an extra getSession() lock acquisition.
    // If the stored token is still valid the backend will respond; if not, fetchUser
    // handles the 401 gracefully.
    const userData = await fetchUser()
    setUser(userData)
    // Also refresh agency data for agency/agent roles
    if (userData?.role === 'agency') {
      const { agency: agencyData, role } = await fetchAgency()
      setAgencyState(agencyData)
      setAgencyRole(role)
    }
  }, [fetchUser, fetchAgency])

  /** Check MFA assurance level and update mfaRequired state */
  const checkMfaLevel = useCallback(async () => {
    const supabase = getSupabase()
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

  // Initialize auth on mount.
  // We rely exclusively on onAuthStateChange (which fires INITIAL_SESSION on setup)
  // to avoid calling getSession() in parallel, which triggers an AbortError from
  // Supabase's internal Navigator Locks when both compete for the same lock.
  useEffect(() => {
    const supabase = getSupabase()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        /** Derive hasPassword from session providers — no extra API call needed */
        const getHasPassword = (s: typeof session) => {
          const providers = (s?.user?.app_metadata?.providers as string[]) ?? []
          return providers.includes('email')
        }

        if (event === 'INITIAL_SESSION') {
          if (session) {
            setAccessToken(session.access_token)
            const userData = await fetchUser(session)
            if (userData) userData.hasPassword = getHasPassword(session)
            setUser(userData)
            await checkMfaLevel()
            if (userData?.onboardingCompleted) {
              requestNotificationPermission().catch(() => {})
            }
          }
          setIsLoading(false)
        } else if (event === 'SIGNED_IN' && session) {
          setAccessToken(session.access_token)
          const userData = await fetchUser(session)
          if (userData) userData.hasPassword = getHasPassword(session)
          setUser(userData)
          setIsLoading(false)
          await checkMfaLevel()
          if (userData?.onboardingCompleted) {
            requestNotificationPermission().catch(() => {})
          }
        } else if (event === 'SIGNED_OUT') {
          setAccessToken(null)
          setUser(null)
          setAgencyState(null)
          setAgencyRole(null)
          setMfaRequired(false)
          setIsLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setAccessToken(session.access_token)
          const userData = await fetchUser(session)
          if (userData) userData.hasPassword = getHasPassword(session)
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

  /** Sign in with email and password. Returns the loaded user so callers can redirect based on role. */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Immediately set token and fetch user so the caller can use role info for redirect
    if (data.session) {
      setAccessToken(data.session.access_token)
      const userData = await fetchUser(data.session)
      setUser(userData)
      return userData
    }
    return null
  }, [fetchUser])

  /** Sign up with email and password. Returns whether email confirmation is required. */
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    const requiresConfirmation = !data.session
    return { requiresConfirmation }
  }, [])

  /** Send password reset email */
  const sendPasswordReset = useCallback(async (email: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) throw error
  }, [])

  /** Update password for authenticated user (works for both email and Google users) */
  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }, [])

  /** Verify current password by re-authenticating. Returns true if password is correct. */
  const verifyCurrentPassword = useCallback(async (password: string): Promise<boolean> => {
    const supabase = getSupabase()
    const email = user?.email
    if (!email) return false
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return !error
  }, [user?.email])

  /** Change password via backend: verifies current password then updates.
   *  currentPassword is optional — omit for Google-only accounts. */
  const changePassword = useCallback(async (currentPassword: string | undefined, newPassword: string): Promise<void> => {
    await apiClient.patch('/users/me/password', { currentPassword, newPassword })
  }, [])

  /** Sign out and clear state */
  const signOut = useCallback(async () => {
    // Clear local state immediately so UI updates
    setAccessToken(null)
    setUser(null)
    // Remove FCM token and sign out from Supabase in background
    removeFcmToken().catch(() => {})
    try {
      const supabase = getSupabase()
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[Auth] signOut error:', err)
    }
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    mfaRequired,
    agency,
    agencyRole,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    updatePassword,
    verifyCurrentPassword,
    changePassword,
    signOut,
    logout: signOut,
    refreshUser,
    setMfaVerified,
    setAgency,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
