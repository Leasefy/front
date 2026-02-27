'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'

const AUTH_STORAGE_KEY = 'arriendo-facil-auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * Roles allowed to access this route
   * If not specified, any authenticated user can access
   */
  allowedRoles?: ('tenant' | 'landlord' | 'agency')[]
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
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, mfaRequired } = useAuth()
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

  useEffect(() => {
    // Wait for both auth context and storage check to complete
    if (isLoading || isCheckingStorage) return

    // Redirect to auth if not authenticated (neither context nor localStorage)
    if (!effectiveIsAuthenticated) {
      const returnUrl = encodeURIComponent(pathname)
      router.replace(`/auth?returnUrl=${returnUrl}`)
      return
    }

    // If user hasn't completed onboarding, redirect to role selection/onboarding
    // Skip this check if already on an onboarding page
    if (user && !user.onboardingCompleted && !pathname.startsWith('/onboarding')) {
      router.replace('/onboarding/seleccionar-rol')
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
    }
  }, [isLoading, isCheckingStorage, effectiveIsAuthenticated, effectiveUser, allowedRoles, pathname, router, mfaRequired, user])

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

  // Not authenticated - will redirect
  if (!effectiveIsAuthenticated) {
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
  if (user && !user.onboardingCompleted && !pathname.startsWith('/onboarding')) {
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

  // User is authenticated and has required role
  return <>{children}</>
}
