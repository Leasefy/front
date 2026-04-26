'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'
import type { AgencyMemberRole } from '@/lib/auth/types'

const AUTH_STORAGE_KEY = 'arriendo-facil-auth'
const TENANT_ONBOARDING_KEY = 'plan_onboarding_tenant'
const PENDING_INVITATION_KEY = 'pending-invitation-token'

interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * Roles allowed to access this route.
   * If not specified, any authenticated user can access.
   */
  allowedRoles?: ('tenant' | 'landlord' | 'agency')[]
  /**
   * Agency team roles that are explicitly blocked from this route.
   * Applied after allowedRoles — useful to block CONTADOR/VIEWER within 'agency'.
   * Blocked users are redirected to /panel/inmobiliaria.
   */
  blockedAgencyRoles?: AgencyMemberRole[]
}

/**
 * Protected Route Wrapper
 *
 * Wraps content that requires authentication. Redirects to /auth
 * with return URL if user is not authenticated.
 * Redirects to onboarding if user hasn't completed it.
 *
 * @example
 * // Any authenticated user
 * <ProtectedRoute>{children}</ProtectedRoute>
 *
 * // Landlord only
 * <ProtectedRoute allowedRoles={['landlord']}>{children}</ProtectedRoute>
 */
export function ProtectedRoute({ children, allowedRoles, blockedAgencyRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, mfaRequired, needsOnboarding, agencyRole } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingStorage, setIsCheckingStorage] = useState(true)
  const [storageUser, setStorageUser] = useState<{ role: string } | null>(null)

  // Check localStorage directly as a fallback
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setStorageUser(parsed)
      }
    } catch {
      // Ignore errors
    }
    setIsCheckingStorage(false)
  }, [])

  // Determine effective authentication state
  // Trust either the context OR localStorage
  const effectiveUser = user || storageUser
  const effectiveIsAuthenticated = isAuthenticated || !!storageUser

  // Agency users (owners and invited agents) skip generic onboarding
  const isAgencyUser = user?.role === 'agency' || user?.backendRole === 'AGENT'

  useEffect(() => {
    // Wait for both auth context and storage check to complete
    if (isLoading || isCheckingStorage) return

    // JWT valid but backend has no user record yet → send to onboarding
    // IMPORTANT: this check must come BEFORE !effectiveIsAuthenticated, because
    // in this state `user` is null but the session is valid and we don't want
    // to kick the user back to /auth in a loop.
    if (needsOnboarding && !pathname.startsWith('/onboarding')) {
      router.replace('/onboarding/seleccionar-rol')
      return
    }

    // Redirect to auth if not authenticated (neither context nor localStorage)
    if (!effectiveIsAuthenticated) {
      const returnUrl = encodeURIComponent(pathname)
      router.replace(`/auth?returnUrl=${returnUrl}`)
      return
    }

    // If user hasn't completed onboarding, redirect to role selection/onboarding
    // Skip this check if already on an onboarding page
    // Also check localStorage as a fallback (in case refreshUser hasn't propagated yet)
    const tenantOnboardingDone = (() => {
      try {
        const stored = localStorage.getItem(TENANT_ONBOARDING_KEY)
        if (!stored) return false
        const parsed = JSON.parse(stored)
        return parsed.isComplete === true
      } catch {
        return false
      }
    })()
    // Agency users (owners and invited agents) skip the generic onboarding —
    // their onboarding happens via the invitation flow or the inmobiliaria setup.
    if (user && !user.onboardingCompleted && !tenantOnboardingDone && !pathname.startsWith('/onboarding') && !isAgencyUser) {
      // If there's a pending invitation token (user confirmed email but lost the URL),
      // send them back to /registro so the auto-accept can fire with the stored token.
      const pendingInvitation = (() => {
        try { return localStorage.getItem(PENDING_INVITATION_KEY) } catch { return null }
      })()
      if (pendingInvitation) {
        router.replace('/registro')
      } else {
        router.replace('/onboarding/seleccionar-rol')
      }
      return
    }

    // If MFA is required, redirect to MFA verify page
    if (mfaRequired && !pathname.startsWith('/auth/mfa-verify')) {
      router.replace('/auth/mfa-verify')
      return
    }

    // Check role restriction
    if (allowedRoles && effectiveUser && !allowedRoles.includes(effectiveUser.role as 'tenant' | 'landlord' | 'agency')) {
      // User is authenticated but doesn't have required role
      // Redirect to appropriate dashboard based on their role
      if (effectiveUser.role === 'agency') {
        router.replace('/panel/inmobiliaria')
      } else if (effectiveUser.role === 'landlord') {
        router.replace('/panel')
      } else {
        router.replace('/inquilino')
      }
      return
    }

    // Check blocked agency team roles (e.g. CONTADOR, VIEWER blocked from /publicar)
    if (blockedAgencyRoles && agencyRole && blockedAgencyRoles.includes(agencyRole)) {
      router.replace('/panel/inmobiliaria')
      return
    }
  }, [isLoading, isCheckingStorage, effectiveIsAuthenticated, effectiveUser, allowedRoles, blockedAgencyRoles, agencyRole, pathname, router, mfaRequired, user, needsOnboarding])

  // Show loading state while checking auth
  if (isLoading || isCheckingStorage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  // needsOnboarding or not authenticated - will redirect (handled in effect)
  if (needsOnboarding || !effectiveIsAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  // Onboarding not completed - will redirect
  const tenantOnboardingDoneRender = (() => {
    try {
      const stored = localStorage.getItem(TENANT_ONBOARDING_KEY)
      if (!stored) return false
      const parsed = JSON.parse(stored)
      return parsed.isComplete === true
    } catch {
      return false
    }
  })()
  if (user && !user.onboardingCompleted && !tenantOnboardingDoneRender && !pathname.startsWith('/onboarding') && !isAgencyUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  // MFA required - will redirect to verify page
  if (mfaRequired && !pathname.startsWith('/auth/mfa-verify')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Verificando seguridad...</p>
        </div>
      </div>
    )
  }

  // Check role restriction
  if (allowedRoles && effectiveUser && !allowedRoles.includes(effectiveUser.role as 'tenant' | 'landlord' | 'agency')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  // Check blocked agency team roles
  if (blockedAgencyRoles && agencyRole && blockedAgencyRoles.includes(agencyRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  // User is authenticated and has required role
  return <>{children}</>
}
