'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

export interface PolicyAutoSkipStepProps {
  /** True while a wizard step submit (this one, or a lingering previous one) is in flight. */
  isSubmitting: boolean
  /**
   * Submits the policy step with the agent's default policy (see
   * `POLICY_STEP_DEFAULT_VALUES`). Must resolve to a falsy value (`null`) on
   * failure — mirrors `useOnboardingSession`'s step actions, which never throw
   * to the caller.
   */
  onSkip: () => Promise<unknown>
}

/**
 * The `policy` wizard step is no longer user-facing: the collection policy is an
 * optional first adjustment configured later in the agency panel. Instead of a
 * form, this step auto-submits the agent's default policy exactly once and shows
 * a brief loading affordance while it round-trips — `useOnboardingSession`
 * advances `currentStep` to `'habeas_data'` on success, at which point the
 * parent stops rendering this component.
 *
 * Same once-only / explicit-retry contract as `PaymentProviderAutoSkipStep`:
 * `firedRef` flips to `true` before the first attempt and is never reset, so a
 * React StrictMode double-invoke (or unrelated re-render) can never cause a
 * second automatic submit. A failed attempt only retries on explicit user
 * click — no infinite loop.
 */
export function PolicyAutoSkipStep({ isSubmitting, onSkip }: PolicyAutoSkipStepProps) {
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
    // Intentionally only depends on `isSubmitting` — `attempt` closes over the
    // latest `onSkip` each render, and `firedRef` is the actual guard against
    // re-firing (see PaymentProviderAutoSkipStep for the same rationale).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitting])

  if (failed) {
    return (
      <div
        data-testid="policy-skip-error"
        className="rounded-md bg-danger-soft border border-border p-4 text-center space-y-3"
      >
        <p className="text-sm text-danger">
          No pudimos aplicar la configuración inicial. Intenta de nuevo.
        </p>
        <Button type="button" variant="outline" size="sm" hideArrow onClick={attempt}>
          <ArrowClockwise className="w-4 h-4" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" data-testid="policy-skip-loading">
      <Spinner size="md" variant="muted" />
      <p className="text-body-sm text-fg-muted">Configurando tu cuenta...</p>
    </div>
  )
}
