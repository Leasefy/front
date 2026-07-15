'use client'

/**
 * useOnboardingSession — orchestration hook for the agency onboarding wizard.
 *
 * Wraps `src/lib/api/onboarding-session.service.ts` (session-based, agent-direct
 * calls — see that file's header) with the state machine the wizard UI needs:
 *
 *  - Rehydration: on mount (and whenever `sessionId` changes) calls
 *    `resumeOnboarding` so a browser refresh mid-wizard lands the user back on
 *    the correct step with the persisted draft.
 *  - One typed submit action per wizard step, updating `currentStep` /
 *    `nextStep` / `draft` from the response envelope.
 *  - 409 conflict handling: if a step submit is rejected because the session
 *    has moved on (e.g. two tabs, or the back already advanced it), `currentStep`
 *    is corrected from `error.conflict.requiredStep` so the UI can redirect
 *    without a separate resume round-trip.
 *  - Bounded exponential backoff retry — ONLY for `unavailable` (503) and
 *    `network` errors, which are the only transient kinds the service defines.
 *    3 attempts total (1 initial + 2 retries), delays 500ms / 1000ms. Every
 *    other kind (`validation`, `unauthorized`, `forbidden`, `notFound`,
 *    `conflict`, `expired`, `unknown`) is terminal and surfaces immediately.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  OnboardingSessionError,
  submitAgency as submitAgencyStep,
  submitMembers as submitMembersStep,
  submitPaymentProvider as submitPaymentProviderStep,
  submitPolicy as submitPolicyStep,
  presignHabeasData as presignHabeasDataStep,
  confirmHabeasData as confirmHabeasDataStep,
  completeOnboarding as completeOnboardingStep,
  resumeOnboarding,
} from '../api/onboarding-session.service'
import type {
  OnboardingSessionAgencyRequest,
  OnboardingSessionAgencyResponse,
  OnboardingSessionMembersRequest,
  OnboardingSessionMembersResponse,
  OnboardingSessionPaymentProviderRequest,
  OnboardingSessionPaymentProviderResponse,
  OnboardingSessionPolicyRequest,
  OnboardingSessionPolicyResponse,
  OnboardingSessionHabeasDataPresignRequest,
  OnboardingSessionHabeasDataPresignResponse,
  OnboardingSessionHabeasDataConfirmRequest,
  OnboardingSessionHabeasDataConfirmResponse,
  OnboardingSessionCompleteResponse,
} from '../api/generated/agency'

export type OnboardingWizardStep =
  | 'start'
  | 'agency'
  | 'members'
  | 'payment_provider'
  | 'policy'
  | 'habeas_data'
  | 'complete'

export type OnboardingSessionStatus = 'idle' | 'loading' | 'submitting' | 'error'

/** Shape shared by every step response except presign (no draft) and complete (terminal). */
interface StepEnvelope {
  currentStep: OnboardingWizardStep
  nextStep: OnboardingWizardStep | null
  draft: Record<string, unknown>
}

export interface UseOnboardingSessionResult {
  status: OnboardingSessionStatus
  currentStep: OnboardingWizardStep | null
  nextStep: OnboardingWizardStep | null
  draft: Record<string, unknown> | null
  error: OnboardingSessionError | null
  /** Re-runs `resumeOnboarding`. Exposed so the UI can retry after a terminal error. */
  refresh: () => Promise<void>
  submitAgency: (
    body: OnboardingSessionAgencyRequest,
  ) => Promise<OnboardingSessionAgencyResponse | null>
  submitMembers: (
    body: OnboardingSessionMembersRequest,
  ) => Promise<OnboardingSessionMembersResponse | null>
  submitPaymentProvider: (
    body: OnboardingSessionPaymentProviderRequest,
  ) => Promise<OnboardingSessionPaymentProviderResponse | null>
  submitPolicy: (
    body: OnboardingSessionPolicyRequest,
  ) => Promise<OnboardingSessionPolicyResponse | null>
  presignHabeasData: (
    body: OnboardingSessionHabeasDataPresignRequest,
  ) => Promise<OnboardingSessionHabeasDataPresignResponse | null>
  confirmHabeasData: (
    body: OnboardingSessionHabeasDataConfirmRequest,
  ) => Promise<OnboardingSessionHabeasDataConfirmResponse | null>
  completeOnboarding: () => Promise<OnboardingSessionCompleteResponse | null>
}

/** Only these kinds are transient — every other kind is terminal, no retry. */
const RETRYABLE_KINDS = new Set(['unavailable', 'network'])
/** Delay before each retry. 3 total attempts (1 initial + 2 retries). */
const RETRY_DELAYS_MS = [500, 1000]

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function toOnboardingSessionError(err: unknown): OnboardingSessionError {
  if (err instanceof OnboardingSessionError) return err
  const message = err instanceof Error ? err.message : 'Error desconocido en el onboarding.'
  return new OnboardingSessionError('unknown', null, message)
}

async function withRetry<T>(action: () => Promise<T>): Promise<T> {
  let attempt = 0
  for (;;) {
    try {
      return await action()
    } catch (err) {
      const oErr = toOnboardingSessionError(err)
      if (RETRYABLE_KINDS.has(oErr.kind) && attempt < RETRY_DELAYS_MS.length) {
        await wait(RETRY_DELAYS_MS[attempt])
        attempt += 1
        continue
      }
      throw oErr
    }
  }
}

export function useOnboardingSession(sessionId: string): UseOnboardingSessionResult {
  const [status, setStatus] = useState<OnboardingSessionStatus>('loading')
  const [currentStep, setCurrentStep] = useState<OnboardingWizardStep | null>(null)
  const [nextStep, setNextStep] = useState<OnboardingWizardStep | null>(null)
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<OnboardingSessionError | null>(null)

  const mountedRef = useRef(true)
  // Guards against a stale rehydration response overwriting state when
  // `sessionId` changes again before the previous resume call resolves.
  const requestIdRef = useRef(0)

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    [],
  )

  const applyStepEnvelope = useCallback((envelope: StepEnvelope) => {
    if (!mountedRef.current) return
    setCurrentStep(envelope.currentStep)
    setNextStep(envelope.nextStep)
    setDraft(envelope.draft)
  }, [])

  const applyError = useCallback((err: unknown) => {
    const oErr = toOnboardingSessionError(err)
    if (!mountedRef.current) return oErr
    if (oErr.kind === 'conflict' && oErr.conflict?.requiredStep) {
      setCurrentStep(oErr.conflict.requiredStep as OnboardingWizardStep)
    }
    setError(oErr)
    setStatus('error')
    return oErr
  }, [])

  const rehydrate = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setStatus('loading')
    setError(null)
    try {
      const result = await withRetry(() => resumeOnboarding(sessionId))
      if (requestIdRef.current !== requestId) return
      applyStepEnvelope(result)
      if (mountedRef.current) setStatus('idle')
    } catch (err) {
      if (requestIdRef.current !== requestId) return
      applyError(err)
    }
  }, [sessionId, applyStepEnvelope, applyError])

  useEffect(() => {
    void rehydrate()
  }, [rehydrate])

  /** Shared executor for the step actions whose response is a `StepEnvelope`. */
  const runStep = useCallback(
    async <T extends StepEnvelope>(action: () => Promise<T>): Promise<T | null> => {
      setStatus('submitting')
      setError(null)
      try {
        const result = await withRetry(action)
        applyStepEnvelope(result)
        if (mountedRef.current) setStatus('idle')
        return result
      } catch (err) {
        applyError(err)
        return null
      }
    },
    [applyStepEnvelope, applyError],
  )

  const submitAgency = useCallback(
    (body: OnboardingSessionAgencyRequest) => runStep(() => submitAgencyStep(sessionId, body)),
    [runStep, sessionId],
  )
  const submitMembers = useCallback(
    (body: OnboardingSessionMembersRequest) => runStep(() => submitMembersStep(sessionId, body)),
    [runStep, sessionId],
  )
  const submitPaymentProvider = useCallback(
    (body: OnboardingSessionPaymentProviderRequest) =>
      runStep(() => submitPaymentProviderStep(sessionId, body)),
    [runStep, sessionId],
  )
  const submitPolicy = useCallback(
    (body: OnboardingSessionPolicyRequest) => runStep(() => submitPolicyStep(sessionId, body)),
    [runStep, sessionId],
  )
  const confirmHabeasData = useCallback(
    (body: OnboardingSessionHabeasDataConfirmRequest) =>
      runStep(() => confirmHabeasDataStep(sessionId, body)),
    [runStep, sessionId],
  )

  // presignHabeasData and completeOnboarding don't return a StepEnvelope —
  // handled separately: presign leaves currentStep/nextStep/draft untouched,
  // complete pins currentStep to 'complete' on success.
  const presignHabeasData = useCallback(
    async (body: OnboardingSessionHabeasDataPresignRequest) => {
      setStatus('submitting')
      setError(null)
      try {
        const result = await withRetry(() => presignHabeasDataStep(sessionId, body))
        if (mountedRef.current) setStatus('idle')
        return result
      } catch (err) {
        applyError(err)
        return null
      }
    },
    [sessionId, applyError],
  )

  const completeOnboarding = useCallback(async () => {
    setStatus('submitting')
    setError(null)
    try {
      const result = await withRetry(() => completeOnboardingStep(sessionId))
      if (mountedRef.current) {
        setCurrentStep('complete')
        setNextStep(null)
        setStatus('idle')
      }
      return result
    } catch (err) {
      applyError(err)
      return null
    }
  }, [sessionId, applyError])

  return {
    status,
    currentStep,
    nextStep,
    draft,
    error,
    refresh: rehydrate,
    submitAgency,
    submitMembers,
    submitPaymentProvider,
    submitPolicy,
    presignHabeasData,
    confirmHabeasData,
    completeOnboarding,
  }
}
