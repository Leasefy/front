// Re-exports for the agency / permissions domain.
// Source: generated/agent.ts
// Regenerate with: pnpm api:gen (from ~/rent/mvp/)
//
// Agency/onboarding/permissions paths in v0.1.2:
//   GET  /api/agency/{agencyId}/policy
//   GET  /api/agency/{agencyId}/my-permissions
//   GET  /api/agency/{agencyId}/experiments
//   GET  /api/agency/{agencyId}/experiments/{experimentKey}
//   POST /api/agency/{agencyId}/experiments/{experimentKey}/status
//   GET  /api/agency/{agencyId}/experiments/{experimentKey}/report
//   POST /onboarding/start
//   GET  /onboarding/{token}/resume
//   POST /onboarding/{token}/agency
//   POST /onboarding/{token}/members
//   POST /onboarding/{token}/payment-provider
//   POST /onboarding/{token}/policy
//   POST /onboarding/{token}/habeas-data/accept-terms
//   POST /onboarding/{token}/complete
import type { components as AgentComponents } from './agent'
export type { paths, components, operations } from './agent'

// Convenience aliases for agency/onboarding-specific response types.
export type MemberPermissionsResponse = AgentComponents['schemas']['MemberPermissionsResponse']
export type OnboardingStartResponse = AgentComponents['schemas']['OnboardingStartResponse']
export type OnboardingResumeResponse = AgentComponents['schemas']['OnboardingResumeResponse']

// Session-based onboarding wizard (JWT-gated, no magic-link token) — v0.2.0:
//   POST /onboarding/session/{sessionId}/agency
//   POST /onboarding/session/{sessionId}/members
//   POST /onboarding/session/{sessionId}/payment-provider
//   POST /onboarding/session/{sessionId}/policy
//   POST /onboarding/session/{sessionId}/habeas-data/accept-terms
//   POST /onboarding/session/{sessionId}/complete
//   GET  /onboarding/session/{sessionId}/resume
// Shares business logic with the magic-link token routes above via the
// step-core handlers; front-only difference is auth (Bearer JWT vs token
// query param) and the identity gate (sub === session.startedByUserId).
export type OnboardingSessionAgencyRequest =
  AgentComponents['schemas']['OnboardingSessionAgencyRequest']
export type OnboardingSessionAgencyResponse =
  AgentComponents['schemas']['OnboardingSessionAgencyResponse']
export type OnboardingSessionMembersRequest =
  AgentComponents['schemas']['OnboardingSessionMembersRequest']
export type OnboardingSessionMembersResponse =
  AgentComponents['schemas']['OnboardingSessionMembersResponse']
export type OnboardingSessionPaymentProviderRequest =
  AgentComponents['schemas']['OnboardingSessionPaymentProviderRequest']
/**
 * Alternate body for the same endpoint — `{ skip: true }` lets an inmobiliaria
 * finish onboarding without a payment gateway (configured later from the
 * dashboard). Mixing `skip` with credential fields in the same body is a 400.
 * The wizard now sends this exclusively (no user-facing payment-provider
 * step) — see `PaymentProviderAutoSkipStep`.
 */
export type OnboardingSessionPaymentProviderSkipRequest =
  AgentComponents['schemas']['OnboardingSessionPaymentProviderSkipRequest']
export type OnboardingSessionPaymentProviderResponse =
  AgentComponents['schemas']['OnboardingSessionPaymentProviderResponse']
export type OnboardingSessionPolicyRequest =
  AgentComponents['schemas']['OnboardingSessionPolicyRequest']
export type OnboardingSessionPolicyResponse =
  AgentComponents['schemas']['OnboardingSessionPolicyResponse']
/**
 * Paso `habeas_data`. Se completa aceptando los términos, NO subiendo un PDF
 * firmado: el agente borró `habeas-data/presign-url` y `habeas-data/confirm`,
 * y esta es la única ruta que queda para cerrar el paso.
 *
 * La respuesta es un superconjunto del sobre de paso (sessionId/currentStep/
 * nextStep/draft) más el commit del tenant (tenantId/agencyId/status/
 * dashboardUrl): el agente hace en UNA llamada lo que antes eran dos, así que
 * la SPA no llama `/complete` por separado.
 */
export type OnboardingSessionAcceptTermsRequest =
  AgentComponents['schemas']['OnboardingSessionAcceptTermsRequest']
export type OnboardingSessionAcceptTermsResponse =
  AgentComponents['schemas']['OnboardingSessionAcceptTermsResponse']
/** 409 de accept-terms: faltan pasos previos del wizard. */
export type OnboardingSessionAcceptTermsMissingSteps =
  AgentComponents['schemas']['OnboardingSessionAcceptTermsMissingSteps']
export type OnboardingSessionCompleteResponse =
  AgentComponents['schemas']['OnboardingSessionCompleteResponse']
export type OnboardingSessionResumeResponse =
  AgentComponents['schemas']['OnboardingSessionResumeResponse']
/** 409 conflict payload — carries the real `currentStep` so the SPA can redirect. */
export type OnboardingSessionStepConflict =
  AgentComponents['schemas']['OnboardingSessionStepConflict']
// `/complete`'s 409 body is a UNION of the shape above and this one (no
// `requiredStep`, an unordered `missingSteps` list instead) — see
// onboarding-session.service.ts's header comment for how callers discriminate.
export type OnboardingSessionCompleteMissingSteps =
  AgentComponents['schemas']['OnboardingSessionCompleteMissingSteps']
