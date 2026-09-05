'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { OnboardingSessionCompleteResponse, OnboardingSessionStepConflict } from '@/lib/api/generated/agency'
import type { OnboardingSessionError } from '@/lib/api/onboarding-session.service'
import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'

/** El destino del asistente al terminar. Ruta propia, siempre relativa. */
export const RUTA_DEL_PANEL = '/panel/inmobiliaria'

export interface CompleteStepFormProps {
  isSubmitting: boolean
  onSubmit: () => Promise<OnboardingSessionCompleteResponse | null>
  /** Session-level error from the hook — passed as the full object (not just `.message`,
   * like the other step forms) because this step branches on `.kind` and `.conflict`. */
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
}

/**
 * Qué hay para revisar antes de confirmar.
 *
 * El paso decía «Revisa que todo esté en orden» y no mostraba NADA que
 * revisar: sólo el botón (auditoría 2026-09-05). O se muestra lo cargado, o
 * la frase no significa nada.
 */
export function resumenDelRegistro(
  draft: Record<string, unknown> | null | undefined,
): LineaDelResumen[] {
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
    { etiqueta: 'NIT', valor: textoDelDraft(draft, 'nit') ?? '' },
    { etiqueta: 'Dirección', valor: calle ?? '' },
    { etiqueta: 'Ciudad', valor: ubicacion },
    {
      etiqueta: 'Correo de contacto',
      valor:
        textoDelDraft(draft, 'primaryContactEmail') ?? textoDelDraft(draft, 'contactEmail') ?? '',
    },
    {
      etiqueta: 'Teléfono',
      valor:
        textoDelDraft(draft, 'primaryContactPhone') ?? textoDelDraft(draft, 'contactPhone') ?? '',
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
 *  - Success → redirects with `window.location.href` (the response's `dashboardUrl`
 *    is potentially cross-domain, so the Next.js router is deliberately not used here).
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
  const [redirecting, setRedirecting] = useState(false)
  const resumen = resumenDelRegistro(draft)

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
    if (result) {
      setRedirecting(true)
      router.replace(RUTA_DEL_PANEL)
    }
  }

  if (error?.kind === 'conflict') {
    const missingSteps = extractMissingSteps(error.conflict)
    const requiredStep = error.conflict?.requiredStep ?? null

    const missingStepKeys = missingSteps ?? (requiredStep ? [requiredStep] : [])
    const targetStep = missingSteps ? firstMissingStep(missingSteps) : requiredStep

    return (
      <div
        data-testid="complete-step-missing"
        className="rounded-lg border border-border bg-surface p-6 space-y-4 shadow-sm"
      >
        <div className="flex items-start gap-2">
          <WarningCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
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
            size="lg"
            className="w-full"
            onClick={() => onNavigateToStep(targetStep)}
            data-testid="complete-step-go-to-missing"
          >
            Ir a {labelFor(targetStep)}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      data-testid="complete-step-form"
      className="rounded-lg border border-border bg-surface p-6 text-center space-y-4 shadow-sm"
    >
      <div className="w-12 h-12 mx-auto rounded-md bg-primary-soft flex items-center justify-center">
        <CheckCircle className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h2 className="text-h2">Ya casi está</h2>
        <p className="text-body-sm text-fg-muted mt-1">
          {resumen.length > 0
            ? 'Revisa que todo esté en orden y confirma para finalizar tu registro.'
            : 'Confirma para finalizar tu registro.'}
        </p>
      </div>

      {resumen.length > 0 && (
        <dl
          data-testid="complete-step-resumen"
          className="text-left rounded-md border border-border-faint bg-surface-muted divide-y divide-border-faint"
        >
          {resumen.map((linea) => (
            <div key={linea.etiqueta} className="flex items-start justify-between gap-4 px-3 py-2">
              <dt className="text-body-sm text-fg-muted shrink-0">{linea.etiqueta}</dt>
              <dd className="text-body-sm text-fg text-right min-w-0 break-words">{linea.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      <Button
        type="button"
        hideArrow
        size="lg"
        className="w-full"
        disabled={isSubmitting || redirecting}
        onClick={handleFinish}
        data-testid="complete-step-finish"
      >
        {redirecting ? (
          <>
            <Spinner size="xs" variant="current" />
            Redirigiendo a tu panel...
          </>
        ) : isSubmitting ? (
          <>
            <Spinner size="xs" variant="current" />
            Finalizando...
          </>
        ) : (
          <>
            Finalizar onboarding
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  )
}
