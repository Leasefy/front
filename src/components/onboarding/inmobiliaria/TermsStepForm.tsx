'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'

export interface TermsStepFormProps {
  isSubmitting: boolean
  /**
   * Records the terms acceptance and advances the wizard. Resolves to a falsy
   * value (`null`) on failure — same contract as every other step action in
   * `useOnboardingSession`.
   *
   * NOTE (backend handoff): this occupies the agent's `habeas_data` state, but
   * no longer uploads a signed PDF — the step is completed by accepting the
   * terms. The agent must expose a way to complete `habeas_data` from a terms
   * acceptance (see `acceptTerms` in onboarding-session.service.ts).
   */
  onSubmit: () => Promise<unknown>
  /** Session-level `error.kind === 'validation'` message from the hook. */
  submitError?: string | null
}

/**
 * Terms & conditions step. Replaces the former signed-habeas-data upload in the
 * onboarding wizard: the user only has to read and accept the terms. The submit
 * button stays disabled until the checkbox is checked; the link opens the public
 * `/terminos` page in a new tab so wizard state is preserved.
 */
export function TermsStepForm({ isSubmitting, onSubmit, submitError }: TermsStepFormProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedTerms || isSubmitting) return
    await onSubmit()
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5" data-testid="terms-step-form">
      <p className="text-body-sm text-fg-muted">
        Para finalizar tu registro, lee y acepta los términos y condiciones de Leasefy.
      </p>

      <label htmlFor="accept-terms" className="flex items-start gap-2.5 cursor-pointer">
        <Checkbox
          id="accept-terms"
          data-testid="terms-accept"
          checked={acceptedTerms}
          onCheckedChange={(next) => setAcceptedTerms(next === true)}
          disabled={isSubmitting}
          className="mt-0.5 shrink-0"
        />
        <span className="text-sm text-fg-muted leading-snug">
          He leído y acepto los{' '}
          <Link
            href="/terminos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            términos y condiciones
          </Link>
          .
        </span>
      </label>

      {submitError && (
        <div data-testid="terms-step-form-error" className="rounded-md bg-danger-soft border border-border p-3">
          <p className="text-sm text-danger">{submitError}</p>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting || !acceptedTerms} hideArrow size="lg" className="w-full">
        {isSubmitting ? (
          <>
            <Spinner size="xs" variant="current" />
            Guardando...
          </>
        ) : (
          <>
            Continuar
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </form>
  )
}
