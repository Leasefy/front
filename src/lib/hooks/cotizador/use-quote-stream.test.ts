/**
 * useQuoteStream hook tests — Phase 30 plan 30-06 (TDD RED → GREEN)
 *
 * Tests the transport-agnostic correctness surface directly: parseSSEEvent +
 * the carrier sort logic. @testing-library/react is not installed.
 *
 * Transport note: the hook reads the SSE stream with fetch()+ReadableStream and
 * authenticates with a Bearer JWT (agentAuthHeaders) — it no longer uses
 * EventSource/cookies. The Bearer auth + live streaming path is covered by the
 * Playwright e2e spec.
 */

import { describe, it, expect } from 'vitest'
import { parseSSEEvent } from '@/lib/cotizador/sse-schemas'
import type { CarrierState } from './use-quote-stream'

// ---------------------------------------------------------------------------
// Sorting helper (mirrors the hook's internal sortCarriers function)
// ---------------------------------------------------------------------------

const VERDICT_ORDER: Record<CarrierState['status'], number> = {
  approved:    0,
  conditional: 1,
  rejected:    2,
  error:       3,
  stub:        4,
  pending:     5,
}

function sortCarriers(carriers: CarrierState[], allFinal: boolean): CarrierState[] {
  if (!allFinal) {
    return [...carriers].sort((a, b) => b.carrier.localeCompare(a.carrier, 'es'))
  }
  return [...carriers].sort((a, b) => {
    const orderA = VERDICT_ORDER[a.status]
    const orderB = VERDICT_ORDER[b.status]
    if (orderA !== orderB) return orderA - orderB
    const primaA = a.primaMensualCop ?? Infinity
    const primaB = b.primaMensualCop ?? Infinity
    return primaA - primaB
  })
}

function makeCarrier(overrides: Partial<CarrierState> & { carrier: string }): CarrierState {
  return {
    status: 'pending',
    primaMensualCop: null,
    condiciones: [],
    motivoRechazo: null,
    latencyMs: null,
    isStub: false,
    startedAtMs: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useQuoteStream — carrier event parsing', () => {
  it('Test 1 — parseSSEEvent accumulates 3 carrier verdicts correctly', () => {
    const verdicts = [
      { carrier: 'Sura', verdict: 'approved' as const, prima_mensual_cop: 500000, condiciones: [] },
      { carrier: 'Mapfre', verdict: 'conditional' as const, prima_mensual_cop: 400000, condiciones: [] },
      { carrier: 'Bolívar', verdict: 'rejected' as const, prima_mensual_cop: null },
    ]

    const parsed = verdicts.map(v => parseSSEEvent(JSON.stringify(v), 'carrier.verdict'))

    expect(parsed).toHaveLength(3)
    expect(parsed[0].type).toBe('carrier.verdict')
    expect(parsed[1].type).toBe('carrier.verdict')
    expect(parsed[2].type).toBe('carrier.verdict')

    if (parsed[0].type === 'carrier.verdict') expect(parsed[0].data.verdict).toBe('approved')
    if (parsed[1].type === 'carrier.verdict') expect(parsed[1].data.verdict).toBe('conditional')
    if (parsed[2].type === 'carrier.verdict') expect(parsed[2].data.verdict).toBe('rejected')
  })

  it('Test 2 — parseSSEEvent recognizes carrier.dispatched as alias for carrier.start', () => {
    const raw = JSON.stringify({ carrier: 'Sura', started_at_ms: 1000 })
    const parsed = parseSSEEvent(raw, 'carrier.dispatched')
    expect(parsed.type).toBe('carrier.dispatched')
    if (parsed.type === 'carrier.dispatched') {
      expect(parsed.data.carrier).toBe('Sura')
      expect(parsed.data.started_at_ms).toBe(1000)
    }
  })

  it('Test 3 — parseSSEEvent returns unknown for malformed JSON', () => {
    const parsed = parseSSEEvent('{not valid json}', 'carrier.verdict')
    expect(parsed.type).toBe('unknown')
    if (parsed.type === 'unknown') expect(parsed.raw).toBe('{not valid json}')
  })

  it('Test 4 — parseSSEEvent handles agent.final_verdict and marks terminal event', () => {
    const payload = {
      asegurabilidad: 'partial',
      mejor_opcion: { carrier: 'Mapfre', prima_mensual_cop: 380000 },
      reasoning_trace_es: null,
      cohort_insights: null,
      failed_carriers: ['Bolívar'],
    }
    const parsed = parseSSEEvent(JSON.stringify(payload), 'agent.final_verdict')
    expect(parsed.type).toBe('agent.final_verdict')
    if (parsed.type === 'agent.final_verdict') {
      expect(parsed.data.asegurabilidad).toBe('partial')
      expect(parsed.data.mejor_opcion?.carrier).toBe('Mapfre')
    }
  })

  it('Test 5 — carrier reorder on all-final: cheapest-approved first, then conditional, rejected', () => {
    const carriers: CarrierState[] = [
      makeCarrier({ carrier: 'Sura',    status: 'approved',    primaMensualCop: 500000 }),
      makeCarrier({ carrier: 'Mapfre',  status: 'approved',    primaMensualCop: 200000 }),
      makeCarrier({ carrier: 'Bolívar', status: 'rejected',    primaMensualCop: null }),
    ]

    // Before final: descending alpha — Sura, Mapfre, Bolívar
    const pending = sortCarriers(carriers, false)
    expect(pending[0].carrier).toBe('Sura')
    expect(pending[1].carrier).toBe('Mapfre')
    expect(pending[2].carrier).toBe('Bolívar')

    // After final: cheapest-approved (Mapfre 200k) → Sura (500k) → Bolívar (rejected)
    const final = sortCarriers(carriers, true)
    expect(final[0].carrier).toBe('Mapfre')
    expect(final[1].carrier).toBe('Sura')
    expect(final[2].carrier).toBe('Bolívar')
    expect(final[2].status).toBe('rejected')
  })
})
