'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { WarningCircle, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CargaDeMarca } from '@/components/ui/carga-de-marca'
import { ASPA_DE_CIERRE } from '@/components/ui/aspa-de-cierre'
import { OwnerNameStepForm } from '@/components/onboarding/inmobiliaria/OwnerNameStepForm'
import { OnboardingProvisioningErrorBanner } from '@/components/onboarding/inmobiliaria/OnboardingProvisioningErrorBanner'
import {
  useOnboardingProvisioning,
  type UseOnboardingProvisioningResult,
} from '@/lib/hooks/use-onboarding-provisioning'
import { PERFIL_INMOBILIARIA } from './perfiles'

export type AprovisionamientoDelPanel = Pick<
  UseOnboardingProvisioningResult,
  'status' | 'valoresGuardados' | 'fallo' | 'retry' | 'provision'
> &
  Partial<Pick<UseOnboardingProvisioningResult, 'corrigiendo'>>

export interface PanelAntesDeComenzarProps {
  aprovisionamiento: AprovisionamientoDelPanel
  /** Cierra el panel y devuelve las tarjetas al centro. */
  onCerrar: () => void
  /**
   * Avisa si se puede cerrar el panel para volver a elegir perfil, para que el
   * «Salir» de arriba ofrezca «Volver a elegir tu perfil» sólo entonces.
   */
  onPuedeCambiarDePerfil?: (puede: boolean) => void
  /**
   * Avisa si esta persona ya tiene una inmobiliaria a medias (la que creó el
   * envío de este formulario), para que elegir otro perfil pregunte antes de
   * dejarla de lado. `null` = no hay nada que dejar de lado.
   */
  onRegistroAMedias?: (registro: RegistroAMedias | null) => void
}

/** La inmobiliaria a medias que habría que dejar de lado para cambiar de perfil. */
export interface RegistroAMedias {
  razonSocial: string
}

/**
 * «Antes de comenzar», a la derecha de las tarjetas (Nico, 2026-09-30).
 *
 * Lo que se llena es `OwnerNameStepForm`, el mismo de siempre: mismos campos,
 * misma validación, mismo «Continuar» (`provision` → `POST /users/me/onboarding`).
 * Este panel sólo le pone el marco y la salida.
 *
 * 🔴 La ✕ está SIEMPRE, también cuando la inmobiliaria ya existe (Nico,
 * 01-10-2026: «¿cómo se devuelve entonces para ver de nuevo los dos activos?»).
 * Antes desaparecía con la agencia creada, porque elegir «Inquilino» después
 * dejaba una agencia huérfana. Ahora la ✕ devuelve las tarjetas y, si hay
 * una inmobiliaria a medias (`onRegistroAMedias`), elegir otro perfil pregunta
 * y la deja de lado en el back (`DELETE /users/me/onboarding/agency`) antes
 * de seguir. Lo único que la esconde es estar enviando o abriendo el registro.
 */
export function PanelAntesDeComenzar({
  aprovisionamiento,
  onCerrar,
  onPuedeCambiarDePerfil,
  onRegistroAMedias,
}: PanelAntesDeComenzarProps) {
  const { status, valoresGuardados, fallo, retry, provision, corrigiendo = false } = aprovisionamiento
  const sePuedeCambiar = status === 'resuming' || status === 'needs-info'
  const razonSocialAMedias = valoresGuardados?.razonSocial?.trim() || null

  useEffect(() => {
    onPuedeCambiarDePerfil?.(sePuedeCambiar)
  }, [sePuedeCambiar, onPuedeCambiarDePerfil])

  useEffect(() => {
    onRegistroAMedias?.(valoresGuardados ? { razonSocial: razonSocialAMedias ?? 'tu inmobiliaria' } : null)
  }, [valoresGuardados, razonSocialAMedias, onRegistroAMedias])

  // «Abriendo tu registro…» va solo y centrado, sin el marco de la tarjeta:
  // las tarjetas de perfil también se esconden (Nico, 2026-09-30: «que se
  // quede en el centro cargando, que no se vean las cards»).
  if (esLaApertura(status)) {
    return (
      <CargaDeMarca
        disposicion="apilada"
        texto="Abriendo tu registro…"
        className="flex min-h-[40vh] text-center"
        data-testid="abriendo-registro"
      />
    )
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border bg-surface"
      data-testid="panel-antes-de-comenzar"
    >
      {/* En el celular no caben las tarjetas al lado: la elegida queda como cabecera. */}
      <div className="flex items-center gap-3 border-b border-border-faint px-4 py-3 lg:hidden">
        <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-surface-muted">
          <Image
            src={PERFIL_INMOBILIARIA.imagen}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
            style={{ objectPosition: PERFIL_INMOBILIARIA.encuadre }}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Tu perfil</span>
          <span className="block truncate font-heading text-[17px] font-medium leading-tight tracking-[-0.01em] text-fg">
            {PERFIL_INMOBILIARIA.titulo}
          </span>
        </span>
        {sePuedeCambiar ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            hideArrow
            onClick={onCerrar}
            data-testid="cambiar-de-perfil"
          >
            Cambiar
          </Button>
        ) : null}
      </div>

      {sePuedeCambiar ? (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar y elegir otro perfil"
          title="Elegir otro perfil"
          className={cn(ASPA_DE_CIERRE, 'absolute right-8 top-8 z-10 hidden lg:inline-flex')}
          data-testid="cerrar-antes-de-comenzar"
        >
          <X size={16} weight="bold" aria-hidden />
        </button>
      ) : null}

      <div className="p-5 sm:p-8">
        {status === 'resuming' ? (
          <div role="status" aria-label="Cargando tu registro" className="space-y-5" data-testid="panel-cargando">
            <div className="space-y-2.5">
              <div className="h-7 w-52 animate-pulse rounded-sm bg-surface-muted" />
              <div className="h-4 w-full max-w-xs animate-pulse rounded-sm bg-surface-muted" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3.5 w-28 animate-pulse rounded-sm bg-surface-muted" />
                <div className="h-12 animate-pulse rounded-[12px] bg-surface-muted" />
              </div>
            ))}
          </div>
        ) : status === 'needs-info' || status === 'provisioning' ? (
          <>
            {/* La última vez los datos no pasaron: el formulario vuelve lleno
                y esto dice qué revisar. Nunca un «quedó bloqueado». */}
            {status === 'needs-info' && fallo?.paraCorregir ? (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-md bg-warning-soft p-3"
                data-testid="registro-para-corregir"
              >
                <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="fill" aria-hidden />
                <p className="text-body-sm text-fg">{fallo.mensaje}</p>
              </div>
            ) : null}
            <OwnerNameStepForm
              onSubmit={provision}
              isSubmitting={status === 'provisioning'}
              valoresIniciales={valoresGuardados ?? undefined}
              corrigiendo={corrigiendo}
            />
          </>
        ) : (
          <OnboardingProvisioningErrorBanner onRetry={retry} fallo={fallo} />
        )}
      </div>
    </div>
  )
}

/** Todo estado que no sea el formulario, su esqueleto o un error es la apertura. */
function esLaApertura(status: AprovisionamientoDelPanel['status']): boolean {
  return (
    status !== 'resuming' && status !== 'needs-info' && status !== 'provisioning' && status !== 'error'
  )
}

/**
 * El panel cuando se abre desde «Selecciona tu perfil»: trae su propio
 * aprovisionamiento, que arranca recién cuando la persona elige «Inmobiliaria»
 * (antes no hay por qué preguntarle al back dónde quedó). Cuando la sesión del
 * asistente está lista —recién creada o porque ya existía— sigue al mismo
 * paso de siempre: el asistente de `/onboarding/inmobiliaria`.
 */
export function PanelAntesDeComenzarConAprovisionamiento({
  onCerrar,
  onApertura,
  onPuedeCambiarDePerfil,
  onRegistroAMedias,
}: {
  onCerrar: () => void
  /** Avisa cuando el panel pasa a «Abriendo tu registro…», para esconder las tarjetas. */
  onApertura?: (abriendo: boolean) => void
  onPuedeCambiarDePerfil?: (puede: boolean) => void
  onRegistroAMedias?: (registro: RegistroAMedias | null) => void
}) {
  const router = useRouter()
  const aprovisionamiento = useOnboardingProvisioning()
  const listo = aprovisionamiento.status === 'ready'
  const abriendo = esLaApertura(aprovisionamiento.status)

  useEffect(() => {
    if (listo) router.push('/onboarding/inmobiliaria')
  }, [listo, router])

  useEffect(() => {
    onApertura?.(abriendo)
  }, [abriendo, onApertura])

  return (
    <PanelAntesDeComenzar
      aprovisionamiento={aprovisionamiento}
      onCerrar={onCerrar}
      onPuedeCambiarDePerfil={onPuedeCambiarDePerfil}
      onRegistroAMedias={onRegistroAMedias}
    />
  )
}
