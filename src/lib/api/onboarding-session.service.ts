/**
 * onboarding-session.service.ts — session-based onboarding wizard steps.
 *
 * The back starts the session (`POST /api/onboarding/start-session` or similar)
 * and returns `{ agentSessionId, tenantId }`. From there on, the whole wizard
 * talks DIRECTLY to the agent microservice with the user's Supabase JWT — no
 * back involvement, no magic-link token. Every step call hits:
 *
 *   ${NEXT_PUBLIC_AGENT_URL}/onboarding/session/{sessionId}/<step>
 *
 * Auth: `Authorization: Bearer <Supabase JWT>` via `agentAuthHeaders()`
 * (`src/lib/api/agent-auth.ts`). Pattern mirrors the direct-fetch hooks
 * (`use-agent-work-items.ts`, `use-agreement-propose.ts`) rather than
 * `apiClient` — this is agent traffic, not back traffic.
 *
 * Error handling: every step can fail with a small, well-known set of status
 * codes shared across the whole wizard (see agent.ts:1221 onward). Each
 * function throws a typed `OnboardingSessionError` so callers can branch on
 * `.kind` instead of re-parsing status codes at every call site. The 409
 * response body is the `OnboardingSessionStepConflict` shape (`requiredStep`)
 * so the SPA can redirect the user to the step the session is actually on.
 */

import { agentAuthHeaders } from './agent-auth'
import type {
  OnboardingSessionAgencyRequest,
  OnboardingSessionAgencyResponse,
  OnboardingSessionMembersRequest,
  OnboardingSessionMembersResponse,
  OnboardingSessionPaymentProviderRequest,
  OnboardingSessionPaymentProviderSkipRequest,
  OnboardingSessionPaymentProviderResponse,
  OnboardingSessionPolicyRequest,
  OnboardingSessionPolicyResponse,
  OnboardingSessionHabeasDataPresignRequest,
  OnboardingSessionHabeasDataPresignResponse,
  OnboardingSessionHabeasDataConfirmRequest,
  OnboardingSessionHabeasDataConfirmResponse,
  OnboardingSessionCompleteResponse,
  OnboardingSessionResumeResponse,
  OnboardingSessionStepConflict,
} from './generated/agency'

// ── Error type ────────────────────────────────────────────────────────────

export type OnboardingSessionErrorKind =
  | 'validation' // 400 — malformed body (Zod)
  | 'unauthorized' // 401 — missing/invalid Supabase JWT
  | 'forbidden' // 403 — valid JWT but wrong identity / unanchored / completed session
  | 'notFound' // 404 — session not found
  | 'conflict' // 409 — state-machine violation, carries the real currentStep
  | 'expired' // 410 — session expired (7d TTL)
  | 'unavailable' // 503 — database unavailable, UI should retry with backoff
  | 'network' // fetch itself threw (offline / CORS / DNS)
  | 'unknown' // any other status the wizard doesn't special-case (e.g. 500)

export class OnboardingSessionError extends Error {
  readonly kind: OnboardingSessionErrorKind
  /** HTTP status code, or null for network failures (no response was received). */
  readonly status: number | null
  /** Only populated for `kind === 'conflict'` — the real current step. */
  readonly conflict?: OnboardingSessionStepConflict

  constructor(
    kind: OnboardingSessionErrorKind,
    status: number | null,
    message: string,
    conflict?: OnboardingSessionStepConflict,
  ) {
    super(message)
    this.name = 'OnboardingSessionError'
    this.kind = kind
    this.status = status
    this.conflict = conflict
  }
}

const STATUS_TO_KIND: Record<number, OnboardingSessionErrorKind> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
  410: 'expired',
  503: 'unavailable',
}

function isErrorLike(value: unknown): value is { error: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as { error: unknown }).error === 'string'
  )
}

async function throwForErrorResponse(res: Response): Promise<never> {
  const status = res.status
  let parsedBody: unknown = null
  try {
    parsedBody = await res.json()
  } catch {
    parsedBody = null
  }

  const message = isErrorLike(parsedBody)
    ? parsedBody.error
    : `La sesión de onboarding respondió con un error (${status}).`
  const kind = STATUS_TO_KIND[status] ?? 'unknown'

  if (kind === 'conflict') {
    throw new OnboardingSessionError(
      kind,
      status,
      message,
      parsedBody as OnboardingSessionStepConflict,
    )
  }
  throw new OnboardingSessionError(kind, status, message)
}

// ── Fetch helpers ─────────────────────────────────────────────────────────

function stepUrl(sessionId: string, step: string): string {
  return `${process.env.NEXT_PUBLIC_AGENT_URL}/onboarding/session/${sessionId}${step}`
}

async function request<TRes>(sessionId: string, step: string, init: RequestInit): Promise<TRes> {
  let res: Response
  try {
    res = await globalThis.fetch(stepUrl(sessionId, step), init)
  } catch {
    throw new OnboardingSessionError(
      'network',
      null,
      'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
    )
  }
  if (!res.ok) {
    await throwForErrorResponse(res)
  }
  return (await res.json()) as TRes
}

function postStep<TReq, TRes>(sessionId: string, step: string, body: TReq): Promise<TRes> {
  return request<TRes>(sessionId, step, {
    method: 'POST',
    headers: agentAuthHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(body),
  })
}

// ── Public API — one function per wizard step ───────────────────────────────

export function submitAgency(
  sessionId: string,
  body: OnboardingSessionAgencyRequest,
): Promise<OnboardingSessionAgencyResponse> {
  return postStep(sessionId, '/agency', body)
}

export function submitMembers(
  sessionId: string,
  body: OnboardingSessionMembersRequest,
): Promise<OnboardingSessionMembersResponse> {
  return postStep(sessionId, '/members', body)
}

export function submitPaymentProvider(
  sessionId: string,
  body: OnboardingSessionPaymentProviderRequest | OnboardingSessionPaymentProviderSkipRequest,
): Promise<OnboardingSessionPaymentProviderResponse> {
  return postStep(sessionId, '/payment-provider', body)
}

export function submitPolicy(
  sessionId: string,
  body: OnboardingSessionPolicyRequest,
): Promise<OnboardingSessionPolicyResponse> {
  return postStep(sessionId, '/policy', body)
}

export function presignHabeasData(
  sessionId: string,
  body: OnboardingSessionHabeasDataPresignRequest,
): Promise<OnboardingSessionHabeasDataPresignResponse> {
  return postStep(sessionId, '/habeas-data/presign-url', body)
}

export function confirmHabeasData(
  sessionId: string,
  body: OnboardingSessionHabeasDataConfirmRequest,
): Promise<OnboardingSessionHabeasDataConfirmResponse> {
  return postStep(sessionId, '/habeas-data/confirm', body)
}

/**
 * Completes the `habeas_data` wizard step from a terms-and-conditions
 * acceptance instead of a signed-PDF upload (see `TermsStepForm`).
 *
 * Contract (shipped by the agent):
 *   POST /onboarding/session/{sessionId}/habeas-data/accept-terms
 *   body: { accepted: true, termsVersion: string }
 *   → records the acceptance (WHO + which version + when) into
 *     `terms_acceptances`, marks the `habeas_data` step complete, and runs the
 *     same atomic tenant commit as `/complete` in ONE call (the SPA does NOT
 *     call `/complete` separately). Idempotent on double-click.
 * `termsVersion` is REQUIRED by the agent (400 if absent) and is recorded
 * verbatim, so the row reflects exactly the T&C text the user saw. The
 * response is a superset of the step envelope (currentStep/nextStep/draft) plus
 * the tenant-commit fields (tenantId/agencyId/status/dashboardUrl). Once
 * `pnpm api:gen` regenerates the agent types, swap the response type for the
 * generated `OnboardingSessionAcceptTermsResponse`.
 */

/**
 * Version identifier of the Terms & Conditions text currently rendered by
 * `TermsStepForm`. Sent verbatim to the agent for legal traceability. BUMP THIS
 * whenever the T&C copy changes so acceptances are attributed to the right text.
 */
export const CURRENT_TERMS_VERSION = '2026-08'

export function acceptTerms(
  sessionId: string,
): Promise<OnboardingSessionHabeasDataConfirmResponse> {
  return postStep(sessionId, '/habeas-data/accept-terms', {
    accepted: true,
    termsVersion: CURRENT_TERMS_VERSION,
  })
}

/** No request body — the back derives the tenant from the persisted draft. */
export function completeOnboarding(sessionId: string): Promise<OnboardingSessionCompleteResponse> {
  return request(sessionId, '/complete', {
    method: 'POST',
    headers: agentAuthHeaders(),
  })
}

/** Read-only — rehydrates `{ sessionId, currentStep, nextStep, draft }` on refresh. */
export function resumeOnboarding(sessionId: string): Promise<OnboardingSessionResumeResponse> {
  return request(sessionId, '/resume', {
    method: 'GET',
    headers: agentAuthHeaders(),
  })
}
