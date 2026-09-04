'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { House, Buildings, Storefront, Check, type Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/use-auth'
import { useEnabledProfiles } from '@/lib/hooks/use-enabled-profiles'
import { getAgencyHomeRoute } from '@/lib/auth/role-routes'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { LeasefyLogo } from '@/components/brand'
import { SalirDelRegistro } from '@/components/onboarding/SalirDelRegistro'
import { saludo } from '@/lib/onboarding/saludo'

type RoleChoice = 'tenant' | 'landlord' | 'inmobiliaria' | null

const PENDING_INVITATION_KEY = 'pending-invitation-token'

interface OpcionDePerfil {
  valor: Exclude<RoleChoice, null>
  /** La clave con la que el admin puede apagar el perfil en /admin/registration-profiles. */
  bandera: 'tenant' | 'landlord' | 'agency'
  titulo: string
  descripcion: string
  icono: Icon
}

/** El orden es el de la conversación: primero lo simple, al final lo que trae equipo. */
const PERFILES: OpcionDePerfil[] = [
  {
    valor: 'tenant',
    bandera: 'tenant',
    titulo: 'Inquilino',
    descripcion: 'Busco un lugar para vivir',
    icono: House,
  },
  {
    valor: 'landlord',
    bandera: 'landlord',
    titulo: 'Propietario',
    descripcion: 'Quiero arrendar mi propiedad',
    icono: Buildings,
  },
  {
    valor: 'inmobiliaria',
    bandera: 'agency',
    titulo: 'Soy una inmobiliaria',
    descripcion: 'Gestiona propiedades de múltiples propietarios con tu equipo',
    icono: Storefront,
  },
]

/**
 * Una tarjeta de perfil.
 *
 * Antes había tres copias de este bloque y las tres no pintaban igual: las de
 * inquilino y propietario se marcaban en negro (`bg-ink`) y sólo la de
 * inmobiliaria en azul. Lo seleccionado en el producto es azul primary, sin
 * excepciones — de ahí que esto sea UN componente y no tres bloques.
 */
function TarjetaDePerfil({
  opcion,
  seleccionada,
  onSelect,
}: {
  opcion: OpcionDePerfil
  seleccionada: boolean
  onSelect: () => void
}) {
  const Icono = opcion.icono

  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionada}
      onClick={onSelect}
      data-testid={`perfil-${opcion.valor}`}
      className={cn(
        'group relative flex w-full items-center gap-4 rounded-lg border p-5 text-left',
        'transition-[border-color,background-color,box-shadow] duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        seleccionada
          ? 'border-primary bg-primary-soft shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
          : 'border-border bg-surface hover:border-border-strong hover:bg-surface-muted/40',
      )}
    >
      <span
        className={cn(
          'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md transition-colors',
          seleccionada
            ? 'bg-primary text-primary-fg'
            : 'bg-surface-muted text-fg-subtle group-hover:text-fg-muted',
        )}
      >
        <Icono className="h-6 w-6" weight={seleccionada ? 'fill' : 'regular'} aria-hidden />
      </span>

      <span className="min-w-0 flex-1 pr-7">
        <span className="block text-[15px] font-semibold text-fg">{opcion.titulo}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-fg-muted">
          {opcion.descripcion}
        </span>
      </span>

      {seleccionada && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-fg"
        >
          <Check className="h-3.5 w-3.5" weight="bold" aria-hidden />
        </motion.span>
      )}
    </button>
  )
}

export default function SeleccionarRolPage() {
  const router = useRouter()
  const { user, hasActiveAgencyMembership, agencyMembershipChecked, agencyRole } = useAuth()
  // Admin can switch signup profiles off (see /admin/registration-profiles).
  // Fails open: while loading or if the config backend is down, all are shown.
  const { isEnabled: isProfileEnabled } = useEnabledProfiles()
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

  const visibles = PERFILES.filter((perfil) => isProfileEnabled(perfil.bandera))

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <LeasefyLogo className="h-6 w-auto" />
        <SalirDelRegistro />
      </header>

      <main className="flex min-h-[calc(100vh-5rem)] items-start justify-center px-6 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              {saludo(user?.name)}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-body-sm text-fg-muted">
              Selecciona tu perfil para personalizar tu experiencia
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Tu perfil"
            className="mb-7 grid grid-cols-1 gap-3"
          >
            {visibles.map((perfil) => (
              <TarjetaDePerfil
                key={perfil.valor}
                opcion={perfil}
                seleccionada={selected === perfil.valor}
                onSelect={() => setSelected(perfil.valor)}
              />
            ))}
          </div>

          <Button
            type="button"
            onClick={handleContinue}
            disabled={!selected || isLoading}
            hideArrow
            size="lg"
            className="w-full"
          >
            {isLoading ? <Spinner size="sm" variant="current" /> : 'Continuar'}
          </Button>

          <p className="mt-4 text-center text-caption text-fg-subtle">
            Puedes cambiar esto después desde tu perfil.
          </p>
        </div>
      </main>
    </div>
  )
}
