// Re-exports for the cotizador domain.
// Source: generated/agent.ts — do not hand-edit the agent.ts file itself.
// Regenerate with: pnpm api:gen (from ~/rent/mvp/)
//
// NOTE: The cotizador routes (multi-aseguradora quote pipeline) appear in the
// agent spec tags but the HTTP endpoints are not yet published in v0.1.2 paths.
// This file is a forward-compatible placeholder. Once cotizador endpoints are
// added to the agent spec and pnpm api:gen is re-run, add specific aliases below.
export type { paths, components, operations } from './agent'

// Convenience aliases for cotizador-specific types.
// Uncomment and extend as v2.1 plans (Phase 29-03+) consume cotizador endpoints.
//
// Example (once cotizador endpoints exist in the spec):
// export type QuoteResponse = components['schemas']['QuoteResponseSchema']
// export type VerdictSchema = components['schemas']['VerdictSchema']
