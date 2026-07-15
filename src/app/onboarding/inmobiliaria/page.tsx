import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import OnboardingInmobiliariaClient from './OnboardingInmobiliariaClient'

/**
 * Agency onboarding wizard — session-based, agent-direct (see
 * src/lib/api/onboarding-session.service.ts header for the contract).
 *
 * Auth-first: the `agency` step requires `sub === startedByUserId`, so the
 * user MUST be authenticated before the wizard renders anything. No
 * `allowedRoles` — the user doesn't have an agency role yet, they're
 * creating it. Do NOT use AgencyRoleGuard/PageGuard here.
 */
export const metadata: Metadata = {
  title: 'Configura tu inmobiliaria · Leasefy',
  description: 'Completa el registro de tu inmobiliaria en Leasefy.',
}

export default function OnboardingInmobiliariaPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-bg" />}>
        <OnboardingInmobiliariaClient />
      </Suspense>
    </ProtectedRoute>
  )
}
