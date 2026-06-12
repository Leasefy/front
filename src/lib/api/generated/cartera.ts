// Re-exports for the cartera / cobranza domain.
// Source: generated/agent.ts
// Regenerate with: pnpm api:gen (from ~/rent/mvp/)
//
// Cartera/dashboard paths in v0.1.2:
//   GET /api/dashboard/summary/{agencyId}   → DashboardSummaryResponse
//   GET /api/dashboard/portfolio/{agencyId} → DashboardPortfolioResponse
//   GET /api/dashboard/calls/{agencyId}     → DashboardCallsResponse
//   GET /api/dashboard/compliance/{agencyId}→ DashboardComplianceResponse
//   GET /api/dashboard/performance/{agencyId}→ DashboardPerformanceResponse
//   GET /api/agency/{agencyId}/cartera/payment-plans/offer
//   GET/PATCH /api/agency/{agencyId}/cartera/payment-plans/{planId}
//   POST /api/agency/{agencyId}/cartera/payment-plans/{planId}/accept
//   GET /api/agency/{agencyId}/cartera/insurance-claims (+ sub-routes)
//   GET /api/agency/{agencyId}/cartera/legal-artifacts (+ sub-routes)
//   GET /api/agency/{agencyId}/cobranza/daily-report
import type { components as AgentComponents } from './agent'
export type { paths, components, operations } from './agent'

// Convenience aliases for cartera-specific response types.
export type DashboardSummaryResponse = AgentComponents['schemas']['DashboardSummaryResponse']
export type DashboardPortfolioResponse = AgentComponents['schemas']['DashboardPortfolioResponse']
export type DashboardCallsResponse = AgentComponents['schemas']['DashboardCallsResponse']
export type DashboardComplianceResponse = AgentComponents['schemas']['DashboardComplianceResponse']
export type DashboardPerformanceResponse = AgentComponents['schemas']['DashboardPerformanceResponse']

// CarteraOverviewResponse will be added here after Plan 29-06 adds the endpoint and api:gen is re-run:
// export type CarteraOverviewResponse = components['schemas']['CarteraOverviewResponse']
