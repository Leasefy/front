'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LeasefyLogo } from '@/components/brand'
import Link from 'next/link'
import { BrandHomeLink } from '@/components/brand/BrandHomeLink'
import { useOnboardingSession } from '@/lib/hooks/use-onboarding-session'
import { useOnboardingProvisioning } from '@/lib/hooks/use-onboarding-provisioning'
import { OnboardingWizardStepper } from '@/components/onboarding/inmobiliaria/OnboardingWizardStepper'
import { OnboardingSessionErrorBanner } from '@/components/onboarding/inmobiliaria/OnboardingSessionErrorBanner'
import { OnboardingProvisioningErrorBanner } from '@/components/onboarding/inmobiliaria/OnboardingProvisioningErrorBanner'
import { OwnerNameStepForm } from '@/components/onboarding/inmobiliaria/OwnerNameStepForm'
import { AgencyStepForm } from '@/components/onboarding/inmobiliaria/AgencyStepForm'
import {
  computeAgencyStepPrefill,
  type AgencyStepPreStepValues,
} from '@/components/onboarding/inmobiliaria/agency-step-prefill'
import { MembersStepForm, type PendingMembersInvites } from '@/components/onboarding/inmobiliaria/MembersStepForm'
import { PaymentProviderAutoSkipStep } from '@/components/onboarding/inmobiliaria/PaymentProviderAutoSkipStep'
import { PolicyAutoSkipStep } from '@/components/onboarding/inmobiliaria/PolicyAutoSkipStep'
import {
  POLICY_STEP_DEFAULT_VALUES,
  toPolicyRequest,
} from '@/components/onboarding/inmobiliaria/policy-step-schema'
import { TermsStepForm } from '@/components/onboarding/inmobiliaria/TermsStepForm'
import { CompleteStepForm } from '@/components/onboarding/inmobiliaria/CompleteStepForm'
import { wizardStepLabel } from '@/components/onboarding/inmobiliaria/wizard-steps'
import type { OnboardingSessionMembersRequest } from '@/lib/api/generated/agency'
import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'

/**
 * Reads the wizard's sessionId. Two sources:
 *  - `?session=<uuid>` — DEV/TESTING OVERRIDE ONLY. Lets an engineer resume
 *    an existing agent session directly without re-provisioning. Real users
 *    never carry this param.
 *  - Otherwise, the authenticated agency owner's session is provisioned via
 *    `useOnboardingProvisioning` (`POST /users/me/onboarding`), which is
 *    what the back actually returns the `agentSessionId` from (work-unit #4).
 */
export default function OnboardingInmobiliariaClient() {
  const searchParams = useSearchParams()
  const overrideSessionId = searchParams.get('session')

  if (overrideSessionId) {
    return <OnboardingWizard sessionId={overrideSessionId} />
  }

  return <ProvisionedOnboardingWizard />
}

function ProvisionedOnboardingWizard() {
  const { status, sessionId, agencyPrefill, retry, provision } = useOnboardingProvisioning()

  // Provisioning always needs the owner's name plus the agency's razón
  // social and NIT — collect them here and provision explicitly (see
  // useOnboardingProvisioning). The form stays mounted while the request is
  // in flight so the submit button can disable itself (double-submit guard).
  if (status === 'needs-info' || status === 'provisioning') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-sm w-full">
          <OwnerNameStepForm onSubmit={provision} isSubmitting={status === 'provisioning'} />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-sm w-full">
          <OnboardingProvisioningErrorBanner onRetry={retry} />
        </div>
      </div>
    )
  }

  if (status !== 'ready' || !sessionId) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3" data-testid="provisioning-loading">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
          <p className="text-body-sm text-fg-muted">Preparando tu sesión de onboarding...</p>
        </div>
      </div>
    )
  }

  return <OnboardingWizard sessionId={sessionId} preStepAgency={agencyPrefill} />
}

function OnboardingWizard({
  sessionId,
  preStepAgency,
}: {
  sessionId: string
  /**
   * Razón social + NIT captured in-session by `OwnerNameStepForm` (via
   * `useOnboardingProvisioning`). `undefined` for the `?session=` dev
   * override (no pre-step ran) — `computeAgencyStepPrefill` tolerates that
   * and falls back entirely to the resume draft.
   */
  preStepAgency?: AgencyStepPreStepValues | null
}) {
  const router = useRouter()
  const {
    status,
    currentStep,
    draft,
    error,
    refresh,
    submitAgency,
    submitMembers,
    submitPaymentProvider,
    submitPolicy,
    acceptTerms,
    completeOnboarding,
  } = useOnboardingSession(sessionId)

  const isSubmitting = status === 'submitting'

  // 401 mid-wizard is treated as an expired session — bounce to login.
  useEffect(() => {
    if (error?.kind === 'unauthorized') {
      router.replace(`/auth?returnUrl=${encodeURIComponent(`/onboarding/inmobiliaria?session=${sessionId}`)}`)
    }
  }, [error, router, sessionId])

  // Owned here, NOT inside `MembersStepForm` — `submitMembers` (the hook)
  // advances `currentStep` to the next step as soon as it resolves. If the
  // "invitations generated" screen lived in local state inside
  // `MembersStepForm`, this component's `currentStep === 'members'` branch
  // below would swap it out for the next step's form before the user ever
  // saw the `rawToken` links (returned by the agent exactly once). Keeping
  // this state here lets us keep rendering `MembersStepForm` regardless of
  // `currentStep` until the user explicitly clicks "Continuar".
  const [pendingMembersInvites, setPendingMembersInvites] = useState<PendingMembersInvites | null>(null)

  const handleSubmitMembers = async (body: OnboardingSessionMembersRequest) => {
    const result = await submitMembers(body)
    if (result && result.inviteTokens.length > 0) {
      setPendingMembersInvites({ response: result, body })
    }
    return result
  }

  // `complete`'s defensive missing-steps CTA sends the user back to an earlier
  // step client-side (the hook has no "go to step" API and isn't touched here).
  // `withOverrideClear` releases control back to the hook's own `currentStep`
  // the moment the overridden step is actually resubmitted successfully.
  const [completeStepOverride, setCompleteStepOverride] = useState<OnboardingWizardStep | null>(null)

  function withOverrideClear<TArgs extends unknown[], TResult>(
    action: (...args: TArgs) => Promise<TResult | null>,
  ): (...args: TArgs) => Promise<TResult | null> {
    return async (...args: TArgs) => {
      const result = await action(...args)
      if (result) setCompleteStepOverride(null)
      return result
    }
  }

  const effectiveStep = completeStepOverride ?? currentStep

  // While the invite-links screen is pending, keep the stepper/header pinned
  // to "Miembros" instead of following the hook's already-advanced `currentStep`.
  const displayStep = pendingMembersInvites ? 'members' : effectiveStep
  const stepLabel = wizardStepLabel(displayStep)

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-border-faint">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <BrandHomeLink className="flex items-center gap-2">
              <LeasefyLogo size={28} tone="brand" />
            </BrandHomeLink>
            <OnboardingWizardStepper currentStep={displayStep} />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-12 space-y-6">
        {status === 'loading' && error === null && (
          <div className="flex flex-col items-center justify-center gap-3 py-16" data-testid="wizard-loading">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
            <p className="text-body-sm text-fg-muted">Cargando tu sesión de onboarding...</p>
          </div>
        )}

        {error !== null && error.kind !== 'validation' && error.kind !== 'conflict' && (
          <OnboardingSessionErrorBanner error={error} onRetry={refresh} isRetrying={status === 'loading'} />
        )}

        {status !== 'loading' && (error === null || error.kind === 'validation' || error.kind === 'conflict') && (
          <>
            <div className="text-center mb-2">
              <h1 className="text-h1">{stepLabel}</h1>
            </div>

            {effectiveStep === 'agency' || effectiveStep === null || effectiveStep === 'start' ? (
              <AgencyStepForm
                isSubmitting={isSubmitting}
                onSubmit={withOverrideClear(submitAgency)}
                submitError={error !== null && error.kind === 'validation' ? error.message : null}
                prefill={computeAgencyStepPrefill(preStepAgency, draft)}
              />
            ) : effectiveStep === 'members' || pendingMembersInvites ? (
              <MembersStepForm
                isSubmitting={isSubmitting}
                onSubmit={withOverrideClear(handleSubmitMembers)}
                submitError={error !== null && error.kind === 'validation' ? error.message : null}
                pendingInvites={pendingMembersInvites}
                onContinueAfterInvites={() => setPendingMembersInvites(null)}
              />
            ) : effectiveStep === 'payment_provider' ? (
              // Invisible step (fix/onboarding-skip-payment) — an inmobiliaria
              // can finish onboarding without a payment gateway and configure
              // one later from the dashboard. Auto-submits `{ skip: true }`
              // instead of showing PaymentProviderStepForm (kept in the
              // codebase, unreachable from the wizard, for future panel reuse).
              <PaymentProviderAutoSkipStep
                isSubmitting={isSubmitting}
                onSkip={() => withOverrideClear(submitPaymentProvider)({ skip: true })}
              />
            ) : effectiveStep === 'policy' ? (
              // Invisible step — the collection policy is an optional adjustment
              // configured later in the agency panel. Auto-submits the agent's
              // default policy instead of showing PolicyStepForm (kept in the
              // codebase, unreachable from the wizard, for future panel reuse).
              <PolicyAutoSkipStep
                isSubmitting={isSubmitting}
                onSkip={() =>
                  withOverrideClear(submitPolicy)(toPolicyRequest(POLICY_STEP_DEFAULT_VALUES))
                }
              />
            ) : effectiveStep === 'habeas_data' ? (
              // The signed-habeas-data upload was replaced by a terms
              // acceptance. The agent step is still `habeas_data`; it's
              // completed via acceptTerms (backend handoff — see
              // onboarding-session.service.ts). El formulario de subida
              // (HabeasDataStepForm) se borró: sus dos rutas —presign-url y
              // confirm— ya no existen en el agente, así que «guardarlo para
              // después» era guardar llamadas a un 404.
              <TermsStepForm
                isSubmitting={isSubmitting}
                onSubmit={withOverrideClear(acceptTerms)}
                submitError={error !== null && error.kind === 'validation' ? error.message : null}
              />
            ) : (
              <CompleteStepForm
                isSubmitting={isSubmitting}
                onSubmit={completeOnboarding}
                error={error !== null && error.kind === 'conflict' ? error : null}
                onNavigateToStep={setCompleteStepOverride}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
