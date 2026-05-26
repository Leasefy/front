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
//   GET  /onboarding/{token}/habeas-data/presign-url
//   POST /onboarding/{token}/habeas-data/confirm
//   POST /onboarding/{token}/complete
import type { components as AgentComponents } from './agent'
export type { paths, components, operations } from './agent'

// Convenience aliases for agency/onboarding-specific response types.
export type MemberPermissionsResponse = AgentComponents['schemas']['MemberPermissionsResponse']
export type OnboardingStartResponse = AgentComponents['schemas']['OnboardingStartResponse']
export type OnboardingResumeResponse = AgentComponents['schemas']['OnboardingResumeResponse']
