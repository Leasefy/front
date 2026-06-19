/**
 * verdict-derive — pure helpers that fold the cotizador SSE `events[]` stream
 * into the higher-level verdict shapes the comparison UI needs.
 *
 * The relay emits `agent.final_verdict`, `agent.recovery` and
 * `agent.partial_ranking` frames that `useQuoteStream` accumulates into its
 * `events` array but does NOT project into named fields. These helpers do that
 * projection so the page + matriz/recovery components stay declarative.
 *
 * HONESTY CONTRACT: everything here is "Estimado · Prevalidación Leasefy" while
 * the carrier backends are stubs. The matriz reads `stub_mode` off each carrier
 * (CarrierState.isStub) — this module never decides estimado-vs-confirmado,
 * it only exposes the data.
 *
 * The recovery `payload` is `z.unknown()` on the wire (SSERecoverySchema), so
 * `parseRecoveryPaths` is intentionally tolerant: it accepts several plausible
 * shapes and degrades to [] (never throws) when the shape is unrecognized.
 */

import type { ParsedSSEEvent } from '@/lib/cotizador/sse-schemas'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'

// ---------------------------------------------------------------------------
// Projected types
// ---------------------------------------------------------------------------

export type FinalVerdict = Extract<
  ParsedSSEEvent,
  { type: 'agent.final_verdict' }
>['data']

export type PartialRanking = Extract<
  ParsedSSEEvent,
  { type: 'agent.partial_ranking' }
>['data']

export type RecoveryEvent = Extract<
  ParsedSSEEvent,
  { type: 'agent.recovery' }
>['data']

/**
 * One actionable change the operator can apply to flip a "no asegurable"
 * verdict. Derived from the counterfactual recovery payload. `kind` maps 1:1
 * to a counterfactual variable when known, so the CTA can pre-seed the modal.
 */
export interface RecoveryPath {
  /** Maps to a counterfactual variable when recognized; 'custom' otherwise. */
  kind: 'canon' | 'codeudores' | 'ingreso' | 'tipo' | 'custom'
  /** Human label (es-CO) — falls back to the raw payload string. */
  label: string
  /** Optional supporting detail (e.g. suggested target value). */
  detail?: string
}

// ---------------------------------------------------------------------------
// Event folding (last-write-wins — the relay re-emits on resume)
// ---------------------------------------------------------------------------

// `events` is tolerated as undefined/null so consumers (and test mocks that
// omit it) never crash — the derivation just yields null.
type EventsInput = ParsedSSEEvent[] | null | undefined

export function deriveFinalVerdict(events: EventsInput): FinalVerdict | null {
  if (!events) return null
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.type === 'agent.final_verdict') return e.data
  }
  return null
}

export function derivePartialRanking(events: EventsInput): PartialRanking | null {
  if (!events) return null
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.type === 'agent.partial_ranking') return e.data
  }
  return null
}

export function deriveRecovery(events: EventsInput): RecoveryEvent | null {
  if (!events) return null
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.type === 'agent.recovery') return e.data
  }
  return null
}

// ---------------------------------------------------------------------------
// Recovery payload parsing (tolerant — payload is `unknown` on the wire)
// ---------------------------------------------------------------------------

function classifyPathKind(raw: string): RecoveryPath['kind'] {
  const s = raw.toLowerCase()
  if (s.includes('canon') || s.includes('renta')) return 'canon'
  if (s.includes('codeudor') || s.includes('coborrow') || s.includes('co-borrow')) return 'codeudores'
  if (s.includes('ingreso') || s.includes('income') || s.includes('salario')) return 'ingreso'
  if (s.includes('tipo') || s.includes('inmueble')) return 'tipo'
  return 'custom'
}

function coerceString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

/**
 * Best-effort extraction of actionable paths from a recovery payload. Accepts:
 *   - string[]                                  → each entry is a path label
 *   - { paths: string[] }                       → wrapped list
 *   - { changes: Array<{ variable, ... }> }      → structured changes
 *   - Array<{ label?, variable?, kind?, detail?, target? }>
 *   - { message: string }                        → single honest line
 * Returns [] for any unrecognized shape (caller shows the honest fallback).
 */
export function parseRecoveryPaths(payload: unknown): RecoveryPath[] {
  if (payload == null) return []

  // Unwrap common container keys.
  let node: unknown = payload
  if (typeof payload === 'object' && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>
    if (Array.isArray(obj.paths)) node = obj.paths
    else if (Array.isArray(obj.changes)) node = obj.changes
    else if (Array.isArray(obj.options)) node = obj.options
  }

  if (!Array.isArray(node)) {
    // Single object change, e.g. { variable, target }
    if (typeof node === 'object' && node !== null) {
      const p = objectToPath(node as Record<string, unknown>)
      return p ? [p] : []
    }
    return []
  }

  const out: RecoveryPath[] = []
  for (const item of node) {
    if (typeof item === 'string') {
      const label = item.trim()
      if (label.length === 0) continue
      out.push({ kind: classifyPathKind(label), label })
      continue
    }
    if (typeof item === 'object' && item !== null) {
      const p = objectToPath(item as Record<string, unknown>)
      if (p) out.push(p)
    }
  }
  return out
}

function objectToPath(obj: Record<string, unknown>): RecoveryPath | null {
  const label =
    coerceString(obj.label) ??
    coerceString(obj.title) ??
    coerceString(obj.description) ??
    coerceString(obj.text) ??
    coerceString(obj.variable)
  if (!label) return null

  const variable = coerceString(obj.variable) ?? coerceString(obj.kind) ?? label
  const detail =
    coerceString(obj.detail) ??
    coerceString(obj.target) ??
    coerceString(obj.suggestion) ??
    coerceString(obj.hint) ??
    undefined

  return { kind: classifyPathKind(variable), label, detail }
}

// ---------------------------------------------------------------------------
// Matriz row model
// ---------------------------------------------------------------------------

export type MatrizGroup = 'asegurable' | 'condicionada' | 'noAsegurable'

export interface MatrizRow {
  carrier: CarrierState
  group: MatrizGroup
}

function groupOf(status: CarrierState['status']): MatrizGroup {
  if (status === 'approved') return 'asegurable'
  if (status === 'conditional') return 'condicionada'
  // rejected / error / stub / pending → "no asegurable / sin resultado" bucket
  return 'noAsegurable'
}

const GROUP_ORDER: Record<MatrizGroup, number> = {
  asegurable: 0,
  condicionada: 1,
  noAsegurable: 2,
}

/**
 * Build the ordered matriz rows: asegurables first (cheapest prima on top),
 * then condicionadas (cheapest first), then no-asegurables. Pending carriers
 * fall into the last bucket (still streaming) and sort to the bottom.
 */
export function buildMatrizRows(carriers: CarrierState[]): MatrizRow[] {
  return carriers
    .map(carrier => ({ carrier, group: groupOf(carrier.status) }))
    .sort((a, b) => {
      const ga = GROUP_ORDER[a.group]
      const gb = GROUP_ORDER[b.group]
      if (ga !== gb) return ga - gb
      // Cheapest prima first within a group; null prima last.
      const pa = a.carrier.primaMensualCop ?? Infinity
      const pb = b.carrier.primaMensualCop ?? Infinity
      if (pa !== pb) return pa - pb
      return a.carrier.carrier.localeCompare(b.carrier.carrier, 'es')
    })
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatPrimaCop(prima: number | null | undefined): string | null {
  if (prima == null) return null
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(prima)
}

/**
 * latencyMs → human "tiempo de respuesta" string (es-CO). Sub-second renders
 * as "< 1 s"; otherwise one-decimal seconds. Returns null when unknown.
 */
export function formatLatency(latencyMs: number | null | undefined): string | null {
  if (latencyMs == null || !Number.isFinite(latencyMs)) return null
  if (latencyMs < 1000) return '< 1 s'
  const seconds = latencyMs / 1000
  const rounded = Math.round(seconds * 10) / 10
  return `${rounded.toLocaleString('es-CO')} s`
}
