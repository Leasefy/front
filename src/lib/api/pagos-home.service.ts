/**
 * pagos-home.service.ts — Pagos IA Home data-layer service.
 *
 * Four GET wrappers around the agent microservice's `pagos/home` routes:
 *   GET ${NEXT_PUBLIC_AGENT_URL}/api/agency/{agencyId}/pagos/home/...
 *
 * Auth: Supabase bearer token via `agentAuthHeaders()` (no cookies) — same
 * pattern as cotizador / property-capture / ai-hub.
 *
 * Error signalling (so hooks can branch without re-reading the body):
 *   - 503 { error:'pagos_disabled' } → throw PagosHomeError with code 'pagos_disabled'
 *     (a normal "feature off" state, NOT a hard error — hooks surface `disabled`).
 *   - 404 { error:'not_found' }      → getPaymentDetail returns `null`
 *     (other endpoints throw PagosHomeError code 'not_found').
 *   - any other non-ok            → throw PagosHomeError code 'error'.
 *   - missing NEXT_PUBLIC_AGENT_URL → throw PagosHomeError code 'no_agent_url'.
 */

import { agentAuthHeaders } from './agent-auth'
import type {
  OwnerInbox,
  PagosHomeAttention,
  PagosHomeMetrics,
  PaymentDetail,
} from './pagos-home.types'

export type PagosHomeErrorCode =
  | 'pagos_disabled'
  | 'not_found'
  | 'no_agent_url'
  | 'error'

/**
 * Typed error carrying a discriminant `code` so hooks can map
 * 503→disabled / 404→null without re-parsing the response body.
 */
export class PagosHomeError extends Error {
  readonly code: PagosHomeErrorCode
  readonly status: number

  constructor(code: PagosHomeErrorCode, status: number, message?: string) {
    super(message ?? `pagos-home: ${code} (status ${status})`)
    this.name = 'PagosHomeError'
    this.code = code
    this.status = status
  }
}

const AGENCY_BASE = (agencyId: string) =>
  `/api/agency/${encodeURIComponent(agencyId)}/pagos/home`

/** Resolve the agent base URL or throw a typed 'no_agent_url' error. */
function agentBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_AGENT_URL
  if (!url) {
    throw new PagosHomeError('no_agent_url', 0, 'NEXT_PUBLIC_AGENT_URL not configured')
  }
  return url
}

/** Read `{ error }` from a non-ok JSON body, swallowing parse failures. */
async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { error?: string } | null
    return body?.error
  } catch {
    return undefined
  }
}

/**
 * Shared non-ok → PagosHomeError mapper. Detail's 404 is handled by its caller
 * (returns null) and never reaches here.
 */
async function toPagosHomeError(res: Response): Promise<PagosHomeError> {
  const code = await readErrorCode(res)
  if (res.status === 503 || code === 'pagos_disabled') {
    return new PagosHomeError('pagos_disabled', res.status)
  }
  if (res.status === 404 || code === 'not_found') {
    return new PagosHomeError('not_found', res.status)
  }
  return new PagosHomeError('error', res.status)
}

// ── 1. metrics ───────────────────────────────────────────────────────────────

export async function getPagosHomeMetrics(agencyId: string): Promise<PagosHomeMetrics> {
  const res = await globalThis.fetch(`${agentBaseUrl()}${AGENCY_BASE(agencyId)}/metrics`, {
    headers: agentAuthHeaders(),
  })
  if (!res.ok) throw await toPagosHomeError(res)
  return (await res.json()) as PagosHomeMetrics
}

// ── 2. attention ─────────────────────────────────────────────────────────────

export async function getPagosHomeAttention(agencyId: string): Promise<PagosHomeAttention> {
  const res = await globalThis.fetch(`${agentBaseUrl()}${AGENCY_BASE(agencyId)}/attention`, {
    headers: agentAuthHeaders(),
  })
  if (!res.ok) throw await toPagosHomeError(res)
  return (await res.json()) as PagosHomeAttention
}

// ── 3. payment detail (404 → null) ──────────────────────────────────────────

export async function getPaymentDetail(
  agencyId: string,
  invoiceId: string,
): Promise<PaymentDetail | null> {
  const res = await globalThis.fetch(
    `${agentBaseUrl()}${AGENCY_BASE(agencyId)}/payment/${encodeURIComponent(invoiceId)}`,
    { headers: agentAuthHeaders() },
  )
  if (res.status === 404) return null
  if (!res.ok) throw await toPagosHomeError(res)
  return (await res.json()) as PaymentDetail
}

// ── 4. owner inbox ───────────────────────────────────────────────────────────

export async function getOwnerInbox(agencyId: string): Promise<OwnerInbox> {
  const res = await globalThis.fetch(`${agentBaseUrl()}${AGENCY_BASE(agencyId)}/owner-inbox`, {
    headers: agentAuthHeaders(),
  })
  if (!res.ok) throw await toPagosHomeError(res)
  return (await res.json()) as OwnerInbox
}
