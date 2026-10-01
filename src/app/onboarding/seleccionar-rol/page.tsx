'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'
import { getAgencyHomeRoute } from '@/lib/auth/role-routes'
import { CargaDeMarca } from '@/components/ui/carga-de-marca'
import { EleccionDePerfil } from '@/components/onboarding/perfil/EleccionDePerfil'
import { PanelAntesDeComenzarConAprovisionamiento } from '@/components/onboarding/perfil/PanelAntesDeComenzar'

const PENDING_INVITATION_KEY = 'pending-invitation-token'

/**
 * «Selecciona tu perfil». Las tarjetas, su animación y «Antes de comenzar»
 * viven en `EleccionDePerfil`; esta página sólo decide si a esta persona le
 * toca verlas o si ya tiene otro destino.
 */
export default function SeleccionarRolPage() {
  const router = useRouter()
  const { user, hasActiveAgencyMembership, agencyMembershipChecked, agencyRole } = useAuth()

  // Bounded fallback for the membership-probe wait below: if the probe never
  // settles (e.g. it wasn't triggered on this client-side navigation, or the
  // session is degraded), stop waiting after a few seconds and fall through to
  // the normal guards instead of showing a spinner forever. Mirrors the auth
  // context's own "never hang" philosophy.
  const [probeWaitElapsed, setProbeWaitElapsed] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setProbeWaitElapsed(true), 4000)
    return () => clearTimeout(id)
  }, [])

  // Defense-in-depth: an invited user must NEVER see the personal role picker.
  // If a pending invitation token is present, send them to /registro (the
  // invite name/phone form + atomic join) even if they land here directly.
  if (typeof window !== 'undefined') {
    let pendingInvitation: string | null = null
    try { pendingInvitation = localStorage.getItem(PENDING_INVITATION_KEY) } catch { /* ignore */ }
    if (pendingInvitation) {
      router.replace('/registro')
      return null
    }
  }

  // Wait for the async agency-membership probe (GET /inmobiliaria/agency) to
  // settle before deciding whether to show the personal role picker. Without
  // this, a user whose role is already assigned (e.g. an invited CONTADOR/AGENTE
  // who just confirmed their email) would briefly see the picker before the
  // ACTIVE-membership guard below redirects them to their panel.
  if (user && !agencyMembershipChecked && !probeWaitElapsed) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <CargaDeMarca tamano="lg" />
      </div>
    )
  }

  // An ACTIVE agency member must never see the personal role picker either —
  // they already have an agency destination. Send them to their per-sub-role
  // agency landing route (the spinner/bounded-wait above guarantees agencyRole
  // is resolved by the time we get here).
  if (hasActiveAgencyMembership) {
    router.replace(getAgencyHomeRoute(agencyRole))
    return null
  }

  // If user already completed onboarding, redirect to their dashboard
  if (user?.onboardingCompleted) {
    router.replace(user.role === 'landlord' ? '/panel' : user.role === 'agency' ? getAgencyHomeRoute(agencyRole) : '/inquilino')
    return null
  }

  return (
    <EleccionDePerfil
      panelDeInmobiliaria={(cerrar, alAbrirRegistro) => (
        <PanelAntesDeComenzarConAprovisionamiento onCerrar={cerrar} onApertura={alAbrirRegistro} />
      )}
    />
  )
}
