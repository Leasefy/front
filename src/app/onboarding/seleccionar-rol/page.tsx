'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { House, Buildings, Storefront } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/use-auth'
import { getAgencyHomeRoute } from '@/lib/auth/role-routes'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type RoleChoice = 'tenant' | 'landlord' | 'inmobiliaria' | null

const PENDING_INVITATION_KEY = 'pending-invitation-token'

export default function SeleccionarRolPage() {
  const router = useRouter()
  const { user, hasActiveAgencyMembership, agencyMembershipChecked, agencyRole } = useAuth()
  const [selected, setSelected] = useState<RoleChoice>(null)
  const [isLoading, setIsLoading] = useState(false)

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
        <Spinner />
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

  const handleContinue = () => {
    if (!selected) return
    setIsLoading(true)

    if (selected === 'landlord') {
      router.push('/onboarding/propietario')
    } else if (selected === 'inmobiliaria') {
      router.push('/onboarding/inmobiliaria')
    } else {
      router.push('/onboarding/inquilino')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-fg mb-3">
            {user?.name ? `Hola, ${user.name.split(' ')[0]}` : 'Bienvenido a Leasefy'}
          </h1>
          <p className="text-fg-muted">
            Selecciona tu perfil para personalizar tu experiencia
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
          {/* Tenant card */}
          <button
            type="button"
            onClick={() => setSelected('tenant')}
            className={cn(
              'relative flex items-center gap-4 p-5 rounded-[20px] border-2 text-left transition-all duration-200',
              selected === 'tenant'
                ? 'border-fg bg-surface-muted'
                : 'border-border hover:border-border-strong bg-surface'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors flex-shrink-0',
              selected === 'tenant' ? 'bg-ink text-ink-fg' : 'bg-surface-muted text-fg-subtle'
            )}>
              <House className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-fg">Inquilino</p>
              <p className="text-[13px] text-fg-muted mt-0.5">Busco un lugar para vivir</p>
            </div>
            {selected === 'tenant' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 w-6 h-6 rounded-full bg-ink flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </button>

          {/* Landlord card */}
          <button
            type="button"
            onClick={() => setSelected('landlord')}
            className={cn(
              'relative flex items-center gap-4 p-5 rounded-[20px] border-2 text-left transition-all duration-200',
              selected === 'landlord'
                ? 'border-fg bg-surface-muted'
                : 'border-border hover:border-border-strong bg-surface'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors flex-shrink-0',
              selected === 'landlord' ? 'bg-ink text-ink-fg' : 'bg-surface-muted text-fg-subtle'
            )}>
              <Buildings className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-fg">Propietario</p>
              <p className="text-[13px] text-fg-muted mt-0.5">Quiero arrendar mi propiedad</p>
            </div>
            {selected === 'landlord' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 w-6 h-6 rounded-full bg-ink flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </button>

          {/* Inmobiliaria card */}
          <button
            type="button"
            onClick={() => setSelected('inmobiliaria')}
            className={cn(
              'relative flex items-center gap-4 p-5 rounded-[20px] border-2 text-left transition-all duration-200',
              selected === 'inmobiliaria'
                ? 'border-primary/30 bg-primary-soft'
                : 'border-border hover:border-border-strong bg-surface'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors flex-shrink-0',
              selected === 'inmobiliaria' ? 'bg-primary text-primary-fg' : 'bg-surface-muted text-fg-subtle'
            )}>
              <Storefront className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-fg">Soy una inmobiliaria</p>
              <p className="text-[13px] text-fg-muted mt-0.5">Gestiona propiedades de múltiples propietarios con tu equipo</p>
            </div>
            {selected === 'inmobiliaria' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </button>
        </div>

        {/* Continue button */}
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!selected || isLoading}
          hideArrow
          size="lg"
          className="w-full"
        >
          {isLoading ? (
            <Spinner size="sm" variant="current" />
          ) : (
            'Continuar'
          )}
        </Button>
      </div>
    </div>
  )
}
