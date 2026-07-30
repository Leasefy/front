/**
 * Admin channel for the avalúo micro — types + client.
 *
 * ⚠️ Routing (decided): the front does NOT talk to the avalúo micro directly.
 * The micro's admin channel needs a service token (HMAC, 120s replay window)
 * plus `X-Avaluo-Signer`, and both are secrets that must never reach the
 * browser. So every call here goes through `adminApi` (NEXT_PUBLIC_ADMIN_API_URL);
 * the ADMIN BACKEND proxies to the micro and injects, server-side:
 *   - the service token
 *   - `X-Avaluo-Signer` (derived from the admin session → { userId, org })
 *   - `identities` on /detail (anti-IDOR scope; the browser cannot know the
 *     anonymous owner's identities, so the back resolves and appends them)
 *
 * BACKEND HANDOFF — admin-side endpoints the back must expose (it forwards to
 * the micro routes noted in each comment; shapes below are the micro's, passed
 * through unchanged). Ignore docs/INTEGRATION.md §4.1 — it is stale.
 */

import { adminApi } from '@/lib/admin/api'

// ---------------------------------------------------------------------------
// Shared value objects
// ---------------------------------------------------------------------------

/** pctBps / anchoRelativoBps / coverageBps / scoreBps are basis points (100 = 1%). */
export interface Adjustment {
  factor: string
  pctBps: number
}

export interface CompSummary {
  id: string
  observedValue: number
  observedType: string
}

export interface CanonLey820 {
  canonSugeridoCop: number
  topeLegalCop: number
  capped: boolean
  incrementoMaxNote: string
}

export interface Confianza {
  nivel: 'alta' | 'media' | 'baja'
  anchoRelativoBps: number
  nota: string
}

// ---------------------------------------------------------------------------
// 1. Pending-review queue — GET /avaluos/pending-review
//    (micro: GET /api/avaluo/list/pending-review · service token)
//    Returns only `en_revisión`, take 50, createdAt desc. No `state`, no dates.
// ---------------------------------------------------------------------------

export interface PendingReviewItem {
  id: string
  slug: string
  /** ⚠️ Today this is the literal 'Inmueble', NOT a real city. Do not render as city. */
  city: string
  /** 'comparación de mercado' | 'capitalización de renta' | '—' */
  method: string
  valueCop: number | null
  bandLowCop: number | null
  bandHighCop: number | null
  /** AI narrative, read-only */
  narrativaEs: string
  adjustments: Adjustment[]
  comps: CompSummary[]
  canonLey820: CanonLey820 | null
  confianza: Confianza | null
}

export function fetchPendingReview(signal?: AbortSignal): Promise<{ items: PendingReviewItem[] }> {
  return adminApi('/avaluos/pending-review', { signal })
}

// ---------------------------------------------------------------------------
// 2. Detail — GET /avaluos/:id/detail
//    (micro: GET /api/avaluo/[id]/detail?identities=<csv> · back injects identities)
//    [id] = certificate id. `band` is null when the valuation was REFUSED.
// ---------------------------------------------------------------------------

export interface DetailComparable {
  id: string
  observedValue: number
  observedType: string
  adjustments: Adjustment[]
}

export interface AvaluoDetailResponse {
  id: string
  comparables: DetailComparable[]
  band: { lowCop: number | null; highCop: number | null; coverageBps: number } | null
  sufficiency: { status: string; scoreBps: number; compCount: number } | null
}

export function fetchAvaluoDetail(id: string, signal?: AbortSignal): Promise<AvaluoDetailResponse> {
  return adminApi(`/avaluos/${id}/detail`, { signal })
}

// ---------------------------------------------------------------------------
// 3. Signoff — POST /avaluos/:id/signoff
//    (micro: POST /api/avaluo/[id]/signoff · service token + X-Avaluo-Signer)
//    409 { error: "illegal transition ..." } → another admin already decided.
// ---------------------------------------------------------------------------

export type SignoffBody =
  | { action: 'approve' }
  | { action: 'reject'; reason: string }

export interface SignoffResult {
  id: string
  state: 'firmado' | 'rechazado'
  signedBy?: string
  signedAt?: string
  reason?: string
}

export function signoffAvaluo(id: string, body: SignoffBody): Promise<SignoffResult> {
  return adminApi(`/avaluos/${id}/signoff`, { method: 'POST', body })
}

// ---------------------------------------------------------------------------
// 4. General list (facets by state) — GET /avaluos?state=&page=
//    (micro: GET /api/avaluo/list/all · pageSize fixed 100). city ALWAYS null.
//    Reserved for a future "historial" view; not wired into the queue screen yet.
// ---------------------------------------------------------------------------

export interface AvaluoListItem {
  id: string
  slug: string
  state: string
  valueCop: number | null
  signedBy: string | null
  signedAt: string | null
  createdAt: string
  updatedAt: string
  /** ⚠️ ALWAYS null on this route. */
  city: string | null
  method: string
}

export interface AvaluoListResponse {
  items: AvaluoListItem[]
  total: number
  page: number
  pageSize: number
}

export function fetchAvaluoList(
  params: { state?: string; page?: number },
  signal?: AbortSignal,
): Promise<AvaluoListResponse> {
  return adminApi('/avaluos', {
    query: { state: params.state || undefined, page: params.page ?? undefined },
    signal,
  })
}

// ---------------------------------------------------------------------------
// Formatting helpers (bps → %)
// ---------------------------------------------------------------------------

/** Basis points → percent string. 250 → "2.5%". */
export function fmtBps(bps: number | null | undefined, digits = 1): string {
  if (bps == null || !Number.isFinite(bps)) return '—'
  return `${(bps / 100).toFixed(digits)}%`
}

/** Signed basis points → "+2.5%" / "−1.0%". */
export function fmtBpsSigned(bps: number | null | undefined, digits = 1): string {
  if (bps == null || !Number.isFinite(bps)) return '—'
  const pct = bps / 100
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return `${sign}${Math.abs(pct).toFixed(digits)}%`
}

import type { PillTone } from '@/lib/admin/types'

export const CONFIANZA_TONE: Record<Confianza['nivel'], PillTone> = {
  alta: 'ok',
  media: 'warn',
  baja: 'bad',
}
