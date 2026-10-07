'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { CargaDeMarca } from '@/components/ui/carga-de-marca'

export interface PaymentProviderAutoSkipStepProps {
  /** True while a wizard step submit (this one, or a lingering previous one) is in flight. */
  isSubmitting: boolean
  /**
   * Submits `{ skip: true }` to the payment-provider step. Must resolve to a
   * falsy value (`null`) on failure — mirrors `useOnboardingSession`'s step
   * actions, which never throw to the caller.
   */
  onSkip: () => Promise<unknown>
  /**
   * 02-10-2026 · Qué estuvo mal, si el micro lo dijo: el `message` del
   * `OnboardingSessionError` de un 400 (ya en español, por el traductor del
   * servicio). El `null` de `onSkip` no se traga el error: el hook lo deja en
   * `error` y el asistente lo pasa acá. Sin él, la frase general.
   */
  mensajeDelFallo?: string | null
}

/**
 * The `payment_provider` wizard step is no longer user-facing (see
 * `fix/onboarding-skip-payment`): an inmobiliaria can finish onboarding
 * without a payment gateway and configure one later from the dashboard.
 * This step auto-submits the skip payload exactly once and shows a brief
 * loading affordance while it round-trips — `useOnboardingSession` advances
 * `currentStep` to `'policy'` on success, at which point the parent stops
 * rendering this component.
 *
 * `firedRef` is the in-flight guard: it flips to `true` right before the
 * first attempt and is never reset, so remounts from React StrictMode's
 * dev-only double-invoke (or an unrelated parent re-render) can never cause
 * a second automatic POST. A failed attempt only retries on explicit user
 * click (`retry`), never automatically — no infinite loop.
 */
export function PaymentProviderAutoSkipStep({ isSubmitting, onSkip, mensajeDelFallo }: PaymentProviderAutoSkipStepProps) {
  const firedRef = useRef(false)
  const [failed, setFailed] = useState(false)

  const attempt = useCallback(() => {
    firedRef.current = true
    setFailed(false)
    void onSkip().then((result) => {
      if (!result) setFailed(true)
    })
  }, [onSkip])

  useEffect(() => {
    if (firedRef.current || isSubmitting) return
    attempt()
    // Intentionally only depends on `isSubmitting` — `attempt` closes over
    // the latest `onSkip` each render, and `firedRef` is the actual guard
    // against re-firing; re-running this on every `onSkip` identity change
    // would defeat the once-only contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitting])

  if (failed) {
    return (
      <div
        data-testid="payment-provider-skip-error"
        className="rounded-md bg-danger-soft border border-border p-4 text-center space-y-3"
      >
        <p className="text-sm text-danger">
          {mensajeDelFallo || 'No pudimos continuar sin una pasarela de pago. Intenta de nuevo.'}
        </p>
        <Button type="button" variant="outline" size="sm" hideArrow onClick={attempt}>
          <ArrowClockwise className="w-4 h-4" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <CargaDeMarca
      tamano="md"
      tono="negro"
      disposicion="apilada"
      texto="Configurando tu cuenta..."
      className="flex py-16"
      data-testid="payment-provider-skip-loading"
    />
  )
}
