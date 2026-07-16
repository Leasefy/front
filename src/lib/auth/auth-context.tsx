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

/** Map a backend user response to our frontend User type.
 *  `emailConfirmedAt` comes from the Supabase session (the backend does not
 *  track email confirmation) — pass it through when a session is at hand. */
function mapBackendUser(data: Record<string, unknown>, emailConfirmedAt?: string): User {
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
    emailConfirmedAt,
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
    emailConfirmedAt: supabaseUser.email_confirmed_at ?? undefined,
    role: 'tenant',
    // When the backend is unreachable we have no way to confirm onboarding status.
    // Default to true so the user isn't incorrectly sent to the onboarding flow —
    // the panel will gracefully degrade on its own since all API calls will fail too.
    onboardingCompleted: true,
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

/**
 * Recover a previously-known agency tuple from localStorage so consumers that
 * read `useAuth().agency` immediately on mount (cobranza/cotizador hooks)
 * have a non-null identifier before the Supabase session re-hydrates.
 *
 * Mirrors the localStorage-fallback pattern already used in
 * `ProtectedRoute.tsx` (line 49-60) and `PermissionsContext.readAgencyIdFromStorage`.
 * Net behavior in production: identical — the storage entry is populated by
 * the login flow, so this just front-loads it onto first render instead of
 * waiting for `onAuthStateChange` to fire. In tests, the synthetic seed in
 * `tests/e2e/panel-a11y/_helpers/auth-helpers.ts` provides the same shape.
 */
const AUTH_STORAGE_KEY = 'arriendo-facil-auth'
function readAgencyFromStorage(): Agency | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      agencyId?: string
      agency?: { id?: string; name?: string } & Record<string, unknown>
    }
    const id = parsed.agency?.id ?? parsed.agencyId
    if (!id) return null
    // Preserve all known fields; downstream consumers only read `id` today
    // but PermissionsContext / page hooks may grow over time.
    return { id, name: parsed.agency?.name ?? 'Agency', ...parsed.agency } as Agency
  } catch {
    return null
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  // Initialize from localStorage so cobranza/cotizador hooks that gate on
  // `agency?.id` can fire their first fetch in parallel with the Supabase
  // session hydration. The `onAuthStateChange` handler still calls
  // `setAgencyState(agencyData)` on INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED
  // with the canonical backend payload, which overwrites this seed.
  const [agency, setAgencyState] = useState<Agency | null>(() => readAgencyFromStorage())
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
      // Phase 38 plan 38-06 (D-38-06) — server-side seed for PanelPrefsContext.
      // The custom event flows through window (no auth-context↔panel-prefs
      // import cycle). If the backend has not yet wired `preferences` onto
      // /users/me, dismissed defaults to false (tour eligible).
      if (typeof window !== 'undefined') {
        const prefs = data.preferences as Record<string, unknown> | undefined
        const dismissed = prefs?.panel_tour_dismissed_v1 === true
        window.dispatchEvent(
          new CustomEvent('leasefy:preferences:loaded', {
            detail: { panel_tour_dismissed_v1: dismissed },
          }),
        )
      }
      return {
        user: mapBackendUser(data, session?.user?.email_confirmed_at ?? undefined),
        needsOnboarding: false,
      }
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

  // Initialize auth on mount.
  // We rely exclusively on onAuthStateChange (which fires INITIAL_SESSION on setup)
  // to avoid calling getSession() in parallel, which triggers an AbortError from
  // Supabase's internal Navigator Locks when both compete for the same lock.
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    // Safety net: if no known auth event fires within 5s of mount, release the
    // loader so ProtectedRoute can decide what to do with whatever state we have.
    // Covers edge cases where Supabase never emits INITIAL_SESSION (some refresh flows).
    const safetyTimeout = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn('[Auth] onAuthStateChange did not settle within 5s — releasing loader')
        }
        return false
      })
    }, 5000)

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
          // Also refresh agency data for agency/agent roles
          if (userData?.role === 'agency' || userData?.backendRole === 'AGENT') {
            const { agency: agencyData, role } = await fetchAgency(session.access_token)
            setAgencyState(agencyData)
            setAgencyRole(role)
          }
          // CRITICAL: if the very first event on page load is TOKEN_REFRESHED
          // (Supabase auto-refreshed the expired token before emitting INITIAL_SESSION),
          // we must still flip isLoading to false or ProtectedRoute stays stuck forever.
          setIsLoading(false)
        }
      }
    )

    return () => {
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [fetchUser, checkMfaLevel, fetchAgency])

  /** Sign in with Google OAuth via Supabase */
  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')
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
    if (!supabase) throw new Error('Supabase not initialized')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Immediately set token and fetch user so the caller can use role info for redirect
    if (data.session) {
      setAccessToken(data.session.access_token)
      const { user: userData, needsOnboarding: needsOnb } = await fetchUser(data.session)
      setUser(userData)
      setNeedsOnboarding(needsOnb)
      // Resolve the MFA gate before returning so callers (AuthForm) can short-circuit
      // the panel redirect to /auth/mfa-verify when a second factor is required.
      await checkMfaLevel()
      return userData
    }
    return null
  }, [fetchUser, checkMfaLevel])

  /** Sign up with email and password. Returns whether email confirmation is required. */
  const signUpWithEmail = useCallback(async (email: string, password: string, redirectTo?: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    })
    if (error) throw error
    const requiresConfirmation = !data.session
    return { requiresConfirmation }
  }, [])

  /** Send password reset email */
  const sendPasswordReset = useCallback(async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?returnUrl=/auth/update-password`,
    })
    if (error) throw error
  }, [])

  /** Update password for authenticated user (works for both email and Google users) */
  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }, [])

  /** Verify current password by re-authenticating. Returns true if password is correct. */
  const verifyCurrentPassword = useCallback(async (password: string): Promise<boolean> => {
    const supabase = getSupabase()
    if (!supabase) return false
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
  const updateProfile = useCallback(async (data: { firstName?: string | null; lastName?: string | null; phone?: string | null; rut?: string | null; address?: string | null; birthDate?: string | null; emergencyContactName?: string | null; emergencyContactPhone?: string | null }): Promise<void> => {
    const updated = await apiClient.patch<Record<string, unknown>>('/users/me', data)
    // PATCH /users/me has no session at hand — keep the confirmation stamp we already had
    setUser((prev) => ({ ...mapBackendUser(updated, prev?.emailConfirmedAt) }))
  }, [])

  /** Sign out and clear state. Synchronous cleanup runs first; backend
   *  cleanup (FCM, Supabase) is fire-and-forget so a hung lock or network
   *  failure can never block the UI from logging out. */
  const signOut = useCallback(async () => {
    // Best-effort FCM cleanup with the token still in memory.
    // Awaited but with a hard timeout so a slow backend can't stall logout.
    await Promise.race([
      removeFcmToken().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ])

    // Synchronous cleanup — must succeed even if Supabase hangs below.
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((c) => {
        const name = c.split('=')[0]?.trim()
        if (name && (name.startsWith('sb-') || name.startsWith('supabase'))) {
          document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`
          document.cookie = `${name}=; Max-Age=0; path=/`
        }
      })
    }
    if (typeof window !== 'undefined') {
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith('sb-') || k.startsWith('supabase.'))
          .forEach((k) => window.localStorage.removeItem(k))
        Object.keys(window.sessionStorage)
          .filter((k) => k.startsWith('sb-') || k.startsWith('supabase.'))
          .forEach((k) => window.sessionStorage.removeItem(k))
      } catch {}
    }

    setAccessToken(null)
    setUser(null)
    setNeedsOnboarding(false)
    setAgencyState(null)
    setAgencyRole(null)
    setMfaRequired(false)

    // Fire-and-forget — never await, supabase's internal lock can hang here.
    try {
      const supabase = getSupabase()
      supabase?.auth.signOut({ scope: 'local' }).catch(() => {})
    } catch {}
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
