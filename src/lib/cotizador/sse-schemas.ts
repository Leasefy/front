/**
 * SSE event Zod schemas for the cotizador streaming endpoint.
 * Phase 30 plan 30-06 | COTI-UI-03 | XR-02
 *
 * These schemas mirror the D-24-19 wire contract defined in
 * agent/src/server/routes/cotizador-streaming.ts. Any structural drift must be
 * corrected by updating BOTH files and re-running `pnpm api:gen`.
 *
 * Event type → schema mapping:
 *   carrier.start / carrier.dispatched → SSECarrierStartSchema
 *   carrier.verdict / carrier.verdict_received → SSECarrierVerdictSchema
 *   carrier.error → SSECarrierErrorSchema
 *   agent.partial_ranking → SSEPartialRankingSchema
 *   agent.recovery → SSERecoverySchema
 *   agent.cost_recorded → SSECostRecordedSchema (custom — emitted by agent pipeline)
 *   agent.heartbeat → SSEHeartbeatSchema
 *   agent.final_verdict → SSEFinalVerdictSchema (terminal — close EventSource)
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Core schemas (mirrors agent cotizador-streaming.ts exports exactly)
// ---------------------------------------------------------------------------

export const SSECarrierStartSchema = z.object({
  carrier: z.string(),
  started_at_ms: z.number(),
})

export const SSECarrierVerdictSchema = z.object({
  carrier: z.string(),
  verdict: z.enum(['approved', 'conditional', 'rejected', 'error']),
  prima_mensual_cop: z.number().nullable(),
  condiciones: z.array(z.string()).optional(),
})

export const SSECarrierErrorSchema = z.object({
  carrier: z.string(),
  error_code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
}).strict()

export const SSEPartialRankingSchema = z.object({
  ranked_carriers: z.array(
    z.object({ carrier: z.string(), total_score: z.number() }),
  ),
  accepting_count: z.number(),
})

export const SSERecoverySchema = z.object({
  type: z.enum(['alt_path', 'counterfactual']),
  payload: z.unknown(),
})

export const SSEFinalVerdictSchema = z.object({
  asegurabilidad: z.enum(['yes', 'partial', 'no']),
  mejor_opcion: z.object({ carrier: z.string(), prima_mensual_cop: z.number() }).nullable(),
  reasoning_trace_es: z.string().nullable(),
  cohort_insights: z.object({
    cohort_id: z.string(),
    label_es: z.string(),
    confidence: z.number(),
  }).nullable(),
  failed_carriers: z.array(z.string()),
})

export const SSEHeartbeatSchema = z.object({
  elapsed_ms: z.number(),
  awaiting: z.array(z.string()),
})

// ---------------------------------------------------------------------------
// Custom schema (not in original 7 — emitted by the agent pipeline)
// ---------------------------------------------------------------------------

export const SSECostRecordedSchema = z.object({
  cost_usd: z.number(),
  running_total_usd: z.number(),
})

// ---------------------------------------------------------------------------
// Discriminated union types
// ---------------------------------------------------------------------------

export type SSEEventType =
  | 'carrier.start'
  | 'carrier.dispatched'
  | 'carrier.verdict_received'
  | 'carrier.verdict'
  | 'carrier.error'
  | 'agent.partial_ranking'
  | 'agent.recovery'
  | 'agent.cost_recorded'
  | 'agent.heartbeat'
  | 'agent.final_verdict'
  | 'agent.session_expired'

export type ParsedSSEEvent =
  | { type: 'carrier.start'; data: z.infer<typeof SSECarrierStartSchema> }
  | { type: 'carrier.dispatched'; data: z.infer<typeof SSECarrierStartSchema> }
  | { type: 'carrier.verdict_received'; data: z.infer<typeof SSECarrierVerdictSchema> }
  | { type: 'carrier.verdict'; data: z.infer<typeof SSECarrierVerdictSchema> }
  | { type: 'carrier.error'; data: z.infer<typeof SSECarrierErrorSchema> }
  | { type: 'agent.partial_ranking'; data: z.infer<typeof SSEPartialRankingSchema> }
  | { type: 'agent.recovery'; data: z.infer<typeof SSERecoverySchema> }
  | { type: 'agent.cost_recorded'; data: z.infer<typeof SSECostRecordedSchema> }
  | { type: 'agent.heartbeat'; data: z.infer<typeof SSEHeartbeatSchema> }
  | { type: 'agent.final_verdict'; data: z.infer<typeof SSEFinalVerdictSchema> }
  | { type: 'agent.session_expired'; data: { error: string } }
  | { type: 'unknown'; raw: string }

// ---------------------------------------------------------------------------
// Parser helper
// ---------------------------------------------------------------------------

/**
 * Parse a raw SSE data string and event type into a typed ParsedSSEEvent.
 *
 * Malformed JSON or schema validation failures yield { type: 'unknown', raw }.
 * Unrecognized eventType also yields { type: 'unknown', raw }.
 * This function never throws.
 */
export function parseSSEEvent(rawData: string, eventType: string): ParsedSSEEvent {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawData)
  } catch {
    return { type: 'unknown', raw: rawData }
  }

  switch (eventType) {
    case 'carrier.start': {
      const result = SSECarrierStartSchema.safeParse(parsed)
      if (!result.success) return { type: 'unknown', raw: rawData }
      return { type: 'carrier.start', data: result.data }
    }
    case 'carrier.dispatched': {
      // alias → carrier.start schema
      const result = SSECarrierStartSchema.safeParse(parsed)
      if (!result.success) return { type: 'unknown', raw: rawData }
      return { type: 'carrier.dispatched', data: result.data }
    }
    case 'carrier.verdict': {
      const result = SSECarrierVerdictSchema.safeParse(parsed)
      if (!result.success) return { type: 'unknown', raw: rawData }
      return { type: 'carrier.verdict', data: result.data }
    }
    case 'carrier.verdict_received': {
      // alias → carrier.verdict schema
      const result = SSECarrierVerdictSchema.safeParse(parsed)
      if (!result.success) return { type: 'unknown', raw: rawData }
      return { type: 'carrier.verdict_received', data: result.data }
    }
    case 'carrier.error': {
      const result = SSECarrierErrorSchema.safeParse(parsed)
      if (!result.success) return { type: 'unknown', raw: rawData }
      return { type: 'carrier.error', data: result.data }
    }
    case 'agent.partial_ranking': {
      const result = SSEPartialRankingSchema.safeParse(parsed)
      if (!result.success) return { type: 'unknown', raw: rawData }
      return { type: 'agent.partial_ranking', data: result.data }
    }
    case 'agent.recovery': {
      const result = SSERecoverySchema.safeParse(parsed)
      if (!result.success) return { type: 'unknown', raw: rawData }
      return { type: 'agent.recovery', data: result.data }
    }
    case 'agent.cost_recorded': {
      const result = SSECostRecordedSchema.safeParse(parsed)
      if (!result.success) return { type: 'unknown', raw: rawData }
      return { type: 'agent.cost_recorded', data: result.data }
    }
    case 'agent.heartbeat': {
      const result = SSEHeartbeatSchema.safeParse(parsed)
      if (!result.success) return { type: 'unknown', raw: rawData }
      return { type: 'agent.heartbeat', data: result.data }
    }
    case 'agent.final_verdict': {
      const result = SSEFinalVerdictSchema.safeParse(parsed)
      if (!result.success) return { type: 'unknown', raw: rawData }
      return { type: 'agent.final_verdict', data: result.data }
    }
    case 'agent.session_expired': {
      const sessionResult = z.object({ error: z.string() }).safeParse(parsed)
      if (!sessionResult.success) return { type: 'unknown', raw: rawData }
      return { type: 'agent.session_expired', data: sessionResult.data }
    }
    default:
      return { type: 'unknown', raw: rawData }
  }
}
