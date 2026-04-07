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
  const frontendRole = toFrontendRole(backendRole as import('./types').BackendRole)

  // Map role-specific onboarding data stored as JSON in the backend
  const raw = (data.onboardingData as Record<string, unknown> | null) ?? null
  const onboardingData = frontendRole === 'landlord' && raw ? {
    preferredContact: raw.preferredContact as import('./types').PreferredContact | undefined,
    propertyType: raw.propertyType as import('./types').OnboardingData['propertyType'] | undefined,
    propertyCity: raw.propertyCity as string | undefined,
    expectedRent: raw.expectedRent as number | undefined,
  } : undefined

  const tenantOnboardingData = frontendRole === 'tenant' && raw ? {
    preferredContact: raw.preferredContact as import('./types').PreferredContact | undefined,
    employmentType: raw.employmentType as import('./types').EmploymentType | undefined,
    companyName: raw.companyName as string | undefined,
    monthlyIncome: raw.monthlyIncome as number | undefined,
    additionalIncome: raw.additionalIncome as number | undefined,
    budgetMin: raw.budgetMin as number | undefined,
    budgetMax: raw.budgetMax as number | undefined,
    preferredZones: raw.preferredZones as string[] | undefined,
    preferredAmenities: raw.preferredAmenities as string[] | undefined,
    moveInDate: raw.moveInDate as string | undefined,
    hasPets: raw.hasPets as boolean | undefined,
    petDetails: raw.petDetails as string | undefined,
  } : undefined

  return {
    id: data.id as string,
    email: data.email as string,
    name: firstName && lastName ? `${firstName} ${lastName}` : (data.email as string),
    firstName,
    lastName,
    phone: (data.phone as string) || undefined,
    avatar: (data.avatarUrl as string) || undefined,
    rut: (data.rut as string) || undefined,
    address: (data.address as string) || undefined,
    birthDate: (data.birthDate as string) || undefined,
    emergencyContactName: (data.emergencyContactName as string) || undefined,
    emergencyContactPhone: (data.emergencyContactPhone as string) || undefined,
    role: frontendRole,
    backendRole: backendRole as import('./types').BackendRole,
    onboardingCompleted: !!data.firstName,
    onboardingData,
    tenantOnboardingData,
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

/**
 * Detects the specific 401 case where Supabase Auth has a valid JWT but the
 * user has no record in `public.users` on the backend (onboarding never ran).
 * The backend returns: "User not found. Please ensure your account is set up correctly."
 *
 * See .planning/FRONTEND-AUTH-CONTEXT-FIX.md for full context.
 */
function isUserNotFoundError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 401) return false
  const msg = err.message?.toLowerCase() ?? ''
  return msg.includes('user not found')
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [agency, setAgencyState] = useState<Agency | null>(null)
  const [agencyRole, setAgencyRole] = useState<AgencyMemberRole | null>(null)

  /**
   * Fetch the user profile from the backend.
   * Returns one of three states:
   *  - { user: User }            → authenticated, profile loaded
   *  - { needsOnboarding: true } → JWT valid but no backend record yet → go to /onboarding
   *  - { user: null }            → real auth failure (logout) or fallback to Supabase session
   */
  const fetchUser = useCallback(async (
    session?: Session | null,
  ): Promise<{ user: User | null; needsOnboarding: boolean }> => {
    // Use token directly from session to avoid calling getSession() again (can deadlock during init)
    const token = session?.access_token
    try {
      const data = await apiClient.get<Record<string, unknown>>('/users/me', token)
      return { user: mapBackendUser(data), needsOnboarding: false }
    } catch (err) {
      // JWT valid but user doesn't exist in public.users yet → needs onboarding
      if (isUserNotFoundError(err)) {
        return { user: null, needsOnboarding: true }
      }
      // Any other 401 = real token failure → logout (handled by caller returning null user)
      if (err instanceof ApiError && err.status === 401) {
        return { user: null, needsOnboarding: false }
      }
      // Backend unavailable (5xx, network) — fallback to Supabase session data so
      // the user isn't kicked out just because the API is down
      if (session) {
        return { user: mapSupabaseUser(session), needsOnboarding: false }
      }
      console.error('[Auth] Error fetching user profile:', err)
      return { user: null, needsOnboarding: false }
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
      // Backend returns { ...agencyFields, memberRole, memberStatus }
      const data = await apiClient.get<Agency & { memberRole: AgencyMemberRole }>('/inmobiliaria/agency', token)
      const { memberRole, ...agencyFields } = data as Agency & { memberRole: AgencyMemberRole; memberStatus: string }
      return { agency: agencyFields as Agency, role: memberRole }
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
    const { user: userData, needsOnboarding: needsOnb } = await fetchUser()
    setUser(userData)
    setNeedsOnboarding(needsOnb)
    // Also refresh agency data for agency/agent roles (or when just completing inmobiliaria onboarding)
    if (userData?.role === 'agency' || userData?.backendRole === 'AGENT') {
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
            const { user: userData, needsOnboarding: needsOnb } = await fetchUser(session)
            if (userData) userData.hasPassword = getHasPassword(session)
            setUser(userData)
            setNeedsOnboarding(needsOnb)
            await checkMfaLevel()
            if (userData?.onboardingCompleted) {
              requestNotificationPermission().catch(() => {})
            }
            if (userData?.role === 'agency' || userData?.backendRole === 'AGENT') {
              const { agency: agencyData, role } = await fetchAgency(session.access_token)
              setAgencyState(agencyData)
              setAgencyRole(role)
            }
          }
          setIsLoading(false)
        } else if (event === 'SIGNED_IN' && session) {
          setAccessToken(session.access_token)
          const { user: userData, needsOnboarding: needsOnb } = await fetchUser(session)
          if (userData) userData.hasPassword = getHasPassword(session)
          setUser(userData)
          setNeedsOnboarding(needsOnb)
          setIsLoading(false)
          await checkMfaLevel()
          if (userData?.onboardingCompleted) {
            requestNotificationPermission().catch(() => {})
          }
          if (userData?.role === 'agency' || userData?.backendRole === 'AGENT') {
            const { agency: agencyData, role } = await fetchAgency(session.access_token)
            setAgencyState(agencyData)
            setAgencyRole(role)
          }
        } else if (event === 'SIGNED_OUT') {
          setAccessToken(null)
          setUser(null)
          setAgencyState(null)
          setAgencyRole(null)
          setMfaRequired(false)
          setNeedsOnboarding(false)
          setIsLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setAccessToken(session.access_token)
          const { user: userData, needsOnboarding: needsOnb } = await fetchUser(session)
          if (userData) userData.hasPassword = getHasPassword(session)
          setUser(userData)
          setNeedsOnboarding(needsOnb)
          await checkMfaLevel()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUser, checkMfaLevel, fetchAgency])

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
      const { user: userData, needsOnboarding: needsOnb } = await fetchUser(data.session)
      setUser(userData)
      setNeedsOnboarding(needsOnb)
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
      redirectTo: `${window.location.origin}/auth/callback?returnUrl=/auth/update-password`,
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

  /** Update user profile fields and refresh local user state */
  const updateProfile = useCallback(async (data: { firstName?: string; lastName?: string; phone?: string; rut?: string; address?: string; birthDate?: string; emergencyContactName?: string; emergencyContactPhone?: string }): Promise<void> => {
    const updated = await apiClient.patch<Record<string, unknown>>('/users/me', data)
    setUser(mapBackendUser(updated))
  }, [])

  /** Sign out and clear state */
  const signOut = useCallback(async () => {
    // Clear local state immediately so UI updates
    setAccessToken(null)
    setUser(null)
    setNeedsOnboarding(false)
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
    needsOnboarding,
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
    updateProfile,
    setMfaVerified,
    setAgency,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
