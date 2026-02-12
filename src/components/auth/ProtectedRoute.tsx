'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * Roles allowed to access this route
   * If not specified, any authenticated user can access
   */
  allowedRoles?: ('tenant' | 'landlord')[]
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
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Wait for auth state to load
    if (isLoading) return

    // Redirect to auth if not authenticated
    if (!isAuthenticated) {
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

    // Check role restriction
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // User is authenticated but doesn't have required role
      // Redirect to appropriate dashboard based on their role
      if (user.role === 'landlord') {
        router.replace('/panel')
      } else {
        router.replace('/inquilino')
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, pathname, router])

  // Show loading state while checking auth
  if (isLoading) {
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
  if (!isAuthenticated) {
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

  // Check role restriction
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
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
