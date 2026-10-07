'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'
import { ArrowRight, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CrossFade, Presence } from '@leasefy/cadence'
import type { OnboardingSessionCompleteResponse, OnboardingSessionStepConflict } from '@/lib/api/generated/agency'
import type { OnboardingSessionError } from '@/lib/api/onboarding-session.service'
import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'
import { InmobiliariaCreada } from './InmobiliariaCreada'

/** El destino del asistente al terminar. Ruta propia, siempre relativa. */
export const RUTA_DEL_PANEL = '/panel/inmobiliaria'

export interface CompleteStepFormProps {
  isSubmitting: boolean
  onSubmit: () => Promise<OnboardingSessionCompleteResponse | null>
  /** Session-level error from the hook — passed as the full object (not just `.message`,
   * like the other step forms) because this step branches on `.kind` and `.conflict`.
   * Un 400 (`validation`) se dice acá mismo, bajo el botón (02-10-2026): antes
   * no llegaba y «Crear mi inmobiliaria» se volvía a prender sin decir nada. */
  error: OnboardingSessionError | null
  /** Navigates the wizard to a step other than `complete` — used by the missing-steps CTA. */
  onNavigateToStep: (step: OnboardingWizardStep) => void
  /**
   * Lo que la persona cargó en los pasos anteriores, para poder revisarlo
   * antes de confirmar. Es el `draft` que devuelve el micro al reanudar la
   * sesión (`Record<string, unknown>` en el cable), leído a la defensiva.
   */
  draft?: Record<string, unknown> | null
}

const MISSING_STEP_LABELS: Record<string, string> = {
  agency: 'Datos de la agencia',
  members: 'Miembros',
  payment_provider: 'Medio de pago',
  policy: 'Política',
  habeas_data: 'Habeas data',
}

/** Wizard order, used to resolve "the first missing step" out of an unordered `missingSteps` list. */
const STEP_ORDER: OnboardingWizardStep[] = ['agency', 'members', 'payment_provider', 'policy', 'habeas_data']

function labelFor(step: string): string {
  return MISSING_STEP_LABELS[step] ?? step
}

/**
 * `/complete`'s 409 body is a UNION of `OnboardingSessionStepConflict` (`requiredStep`)
 * and `OnboardingSessionCompleteMissingSteps` (`missingSteps: string[]`) — the service
 * types `error.conflict` uniformly as the former, so this reads defensively at runtime
 * instead of trusting the static type. See onboarding-session.service.ts's header.
 */
function extractMissingSteps(conflict: OnboardingSessionStepConflict | undefined): string[] | null {
  const candidate = conflict as unknown as { missingSteps?: unknown } | undefined
  return candidate && Array.isArray(candidate.missingSteps) ? (candidate.missingSteps as string[]) : null
}

function firstMissingStep(missingSteps: string[]): OnboardingWizardStep | null {
  const found = STEP_ORDER.find((step) => missingSteps.includes(step))
  if (found) return found
  const fallback = missingSteps[0]
  return STEP_ORDER.includes(fallback as OnboardingWizardStep) ? (fallback as OnboardingWizardStep) : null
}

/**
 * El `draft` del micro llega como `Record<string, unknown>` sin tipar. Se lee
 * a la defensiva: cualquier forma inesperada se comporta como «no lo sabemos»
 * y esa línea del resumen no se pinta — nunca un `undefined` en pantalla ni un
 * dato inventado.
 */
function textoDelDraft(draft: Record<string, unknown> | null | undefined, ...ruta: string[]): string | null {
  let actual: unknown = draft
  for (const clave of ruta) {
    if (typeof actual !== 'object' || actual === null) return null
    actual = (actual as Record<string, unknown>)[clave]
  }
  if (typeof actual !== 'string') return null
  const limpio = actual.trim()
  return limpio === '' ? null : limpio
}

export interface LineaDelResumen {
  etiqueta: string
  valor: string
  /** El valor es un número (NIT, teléfono): se pinta en `font-mono`. */
  mono?: boolean
}

/**
 * Qué hay para revisar antes de confirmar.
 *
 * El paso decía «Revisa que todo esté en orden» y no mostraba NADA que
 * revisar: sólo el botón (auditoría 2026-09-05). O se muestra lo cargado, o
 * la frase no significa nada.
 */
export function resumenDelRegistro(
  borrador: Record<string, unknown> | null | undefined,
): LineaDelResumen[] {
  // El micro guarda el paso Agencia en `draft.agency.{…}`; las claves planas
  // son del flujo viejo del enlace mágico. Se leen las dos.
  const agencia = borrador?.agency
  const draft =
    agencia && typeof agencia === 'object'
      ? { ...borrador, ...(agencia as Record<string, unknown>) }
      : borrador
  const calle = textoDelDraft(draft, 'address', 'calle')
  const ciudad = textoDelDraft(draft, 'address', 'ciudad')
  const departamento = textoDelDraft(draft, 'address', 'departamento')
  const ubicacion = [ciudad, departamento].filter(Boolean).join(', ')

  const miembros = Array.isArray(draft?.members) ? (draft?.members as unknown[]) : []

  const lineas: Array<LineaDelResumen | null> = [
    {
      etiqueta: 'Razón social',
      valor:
        textoDelDraft(draft, 'legalName') ?? textoDelDraft(draft, 'proposedAgencyName') ?? '',
    },
    { etiqueta: 'NIT', valor: textoDelDraft(draft, 'nit') ?? '', mono: true },
    { etiqueta: 'Dirección', valor: calle ?? '' },
    { etiqueta: 'Ciudad', valor: ubicacion },
    {
      etiqueta: 'Correo de la cuenta',
      valor:
        textoDelDraft(draft, 'primaryContactEmail') ?? textoDelDraft(draft, 'contactEmail') ?? '',
    },
    {
      etiqueta: 'Teléfono de la cuenta',
      valor:
        textoDelDraft(draft, 'primaryContactPhone') ?? textoDelDraft(draft, 'contactPhone') ?? '',
      mono: true,
    },
    miembros.length > 0
      ? {
          etiqueta: 'Equipo invitado',
          valor: miembros.length === 1 ? '1 persona' : `${miembros.length} personas`,
        }
      : null,
  ]

  return lineas.filter((l): l is LineaDelResumen => l !== null && l.valor !== '')
}

/**
 * Form for the wizard's terminal `complete` step — no fields, just a confirm CTA
 * that calls `completeOnboarding()`.
 *
 *  - Success → celebración (`InmobiliariaCreada`, con confeti) y, cuando la persona
 *    aprieta «Ir a mi panel», refresca la sesión y navega a una ruta PROPIA
 *    (nunca al `dashboardUrl` absoluto: ver `irAlPanel`).
 *  - 409 conflict → NOT a hard error: the session isn't actually done yet. See
 *    `extractMissingSteps` above for how the two possible 409 shapes are discriminated.
 *  - Any other error kind is NOT handled here — the parent renders the generic
 *    `OnboardingSessionErrorBanner` for those instead (same contract as every other step).
 */
export function CompleteStepForm({
  isSubmitting,
  onSubmit,
  error,
  onNavigateToStep,
  draft,
}: CompleteStepFormProps) {
  const router = useRouter()
  const { refreshUser } = useAuth()
  /** `/complete` salió bien: se celebra antes de ir al panel (Nico, 30-09). */
  const [creada, setCreada] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  // El último error del micro, para que el aviso no se vacíe mientras sale.
  const mensajeDelError = error?.kind === 'validation' ? error.message : null
  const [ultimoError, setUltimoError] = useState(mensajeDelError)
  if (mensajeDelError && mensajeDelError !== ultimoError) setUltimoError(mensajeDelError)
  const resumen = resumenDelRegistro(draft)
  const nombre = textoDelDraft(draft, 'legalName') ?? textoDelDraft(draft, 'proposedAgencyName')

  /**
   * 🔴 NO se navega a `result.dashboardUrl`.
   *
   * Esa URL viene ABSOLUTA del servidor, armada con su `FRONTEND_URL`. En la
   * auditoría del 2026-09-05 el alta terminaba bien (200 en `/complete`) y el
   * navegador caía en `chrome-error://` con tres `ERR_CONNECTION_REFUSED`: el
   * back decía `http://localhost:3001` y el front corría en `:3011`. En
   * producción eso depende de que una variable esté perfecta en dos servicios
   * distintos, y si no lo está el usuario nuevo termina en una pantalla de
   * error de Chrome justo cuando acaba de crear su inmobiliaria.
   *
   * El panel es una ruta NUESTRA: se navega relativo, con el router, sin
   * arrastrar `?agencyId=` (la sesión ya sabe cuál es la agencia).
   */
  const handleFinish = async () => {
    const result = await onSubmit()
    // Primero se celebra; la sesión se refresca y se navega cuando la persona
    // aprieta «Ir a mi panel» (`irAlPanel`). Refrescar antes haría que los
    // guardianes vieran la membresía nueva y se la llevaran a mitad de la
    // celebración.
    if (result) setCreada(true)
  }

  const irAlPanel = async () => {
    if (redirecting) return
    setRedirecting(true)
    /*
     * 🔴 Refrescar la sesión ANTES de navegar (Nico, 2026-09-07: «me dejó en
     * un bucle, no me deja crear cuenta»).
     *
     * `/complete` creaba la inmobiliaria bien, pero el contexto de auth
     * seguía con el `/users/me` de antes —sin membresía— y `ProtectedRoute`,
     * al ver `needsOnboarding`, devolvía al selector de rol. De ahí el rol
     * de nuevo, el «Ya casi está» de golpe (la sesión del back ya estaba en
     * el paso 4) y el selector otra vez. El flujo de inquilino ya hace este
     * refresco; éste no lo hacía.
     *
     * Si el refresco falla igual se navega: el guardián vuelve a sondear la
     * membresía por su cuenta, y quedarse acá sería otro callejón.
     */
    let destinoMfa: 'enroll' | 'verify' | 'none' | void = 'none'
    try {
      destinoMfa = await refreshUser()
    } catch {
      // ver arriba
    }
    /*
     * T-0123: el segundo factor es el ÚLTIMO paso del registro. Quien acaba
     * de crear su inmobiliaria pasa a ser ADMIN activo y el back le exige
     * aal2; si entrara al panel con la sesión aal1, sus primeras llamadas
     * responderían 403 SEGUNDO_FACTOR_REQUERIDO. `refreshUser` ya volvió a
     * evaluar el requisito con el veredicto fresco: acá se decide la ruta
     * de forma explícita, sin depender de que un guardián alcance a
     * redirigir antes de que el panel pida datos.
     */
    if (destinoMfa === 'enroll' || destinoMfa === 'verify') {
      const pantalla = destinoMfa === 'enroll' ? '/auth/mfa-enroll' : '/auth/mfa-verify'
      router.replace(`${pantalla}?returnUrl=${encodeURIComponent(RUTA_DEL_PANEL)}`)
      return
    }
    router.replace(RUTA_DEL_PANEL)
  }

  if (error?.kind === 'conflict') {
    const missingSteps = extractMissingSteps(error.conflict)
    const requiredStep = error.conflict?.requiredStep ?? null

    const missingStepKeys = missingSteps ?? (requiredStep ? [requiredStep] : [])
    const targetStep = missingSteps ? firstMissingStep(missingSteps) : requiredStep

    // «Te faltan estos pasos» reemplaza al resumen cruzándose (el mismo
    // `CrossFade` del otro `return`: cambia su `swapKey`).
    return (
      <CrossFade swapKey="faltan">
      <div data-testid="complete-step-missing" className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning-soft p-4">
          <WarningCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" weight="fill" aria-hidden />
          <div>
            <p className="text-sm font-medium text-fg">Te faltan estos pasos antes de finalizar</p>
            {missingStepKeys.length > 0 && (
              <ul className="mt-2 space-y-1 text-body-sm text-fg-muted list-disc list-inside">
                {missingStepKeys.map((step) => (
                  <li key={step}>{labelFor(step)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {targetStep && (
          <Button
            type="button"
            hideArrow
           
            className="w-full"
            onClick={() => onNavigateToStep(targetStep)}
            data-testid="complete-step-go-to-missing"
          >
            Ir a {labelFor(targetStep)}
            <ArrowRight className="w-4 h-4" weight="bold" aria-hidden />
          </Button>
        )}
      </div>
      </CrossFade>
    )
  }

  return (
    // Sin marco propio, ícono ni «Ya casi está» en negrita: el paso ya vive en
    // la tarjeta del asistente, con su título («Revisa y crea tu
    // inmobiliaria»). Acá queda lo que se revisa y el botón. La frase de
    // apertura sólo cuando no hay resumen: con resumen repetía el título
    // palabra por palabra (la misma frase no se dice dos veces).
    <CrossFade swapKey="resumen">
    <div data-testid="complete-step-form" className="space-y-5">
      {resumen.length === 0 && (
        <p className="text-body-sm text-fg-muted">Confirma para crear tu inmobiliaria.</p>
      )}

      {resumen.length > 0 && (
        <dl
          data-testid="complete-step-resumen"
          className="divide-y divide-border-faint rounded-md border border-border bg-bg"
        >
          {resumen.map((linea) => (
            <div key={linea.etiqueta} className="flex items-start justify-between gap-4 px-4 py-2.5">
              <dt className="shrink-0 text-body-sm text-fg-muted">{linea.etiqueta}</dt>
              <dd
                className={
                  linea.mono
                    ? 'min-w-0 break-words text-right font-mono text-body-sm tabular-nums text-fg'
                    : 'min-w-0 break-words text-right text-body-sm text-fg'
                }
              >
                {linea.valor}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <Button
        type="button"
        hideArrow
       
        className="w-full"
        disabled={isSubmitting || creada}
        onClick={handleFinish}
        data-testid="complete-step-finish"
      >
        {isSubmitting ? (
          <>
            <Spinner size="xs" variant="current" />
            Creando tu inmobiliaria…
          </>
        ) : (
          <>
            Crear mi inmobiliaria
            <ArrowRight className="w-4 h-4" weight="bold" aria-hidden />
          </>
        )}
      </Button>

      {/* Lo que el micro rechazó al crearla (un 400): con sus palabras, ya
          pasadas por el traductor en el servicio. */}
      {/* Entra y sale con `Presence` (al reintentar, se va antes de la respuesta). */}
      <Presence show={error?.kind === 'validation' && Boolean(error.message)}>
        <div
          role="alert"
          data-testid="complete-step-error"
          className="flex items-start gap-2.5 rounded-md border border-danger/20 bg-danger-soft p-3"
        >
          <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" weight="fill" aria-hidden />
          <p className="text-body-sm text-danger">{error?.kind === 'validation' ? error.message : ultimoError}</p>
        </div>
      </Presence>

      {creada ? (
        <InmobiliariaCreada nombre={nombre} onIrAlPanel={() => void irAlPanel()} yendo={redirecting} />
      ) : null}
    </div>
    </CrossFade>
  )
}
