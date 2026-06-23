/**
 * inbox-filter.ts — Phase 7 plan 07-03 (DASH-02)
 *
 * Pure, framework-free sort + filter logic for the prioritized maintenance inbox.
 * NO 'use client', NO React, NO i18n. Every time-dependent computation takes `now`
 * as an argument so callers (and tests) stay deterministic — never Date.now() here.
 *
 * Domain types are IMPORTED from '@/lib/types/mantenimiento' (07-01) and never
 * redefined. Filtering is a conjunction (AND) of independent predicates; each
 * absent filter is a no-op.
 *
 * NOTE on SLA (deviation documented in 07-03-SUMMARY): the real `InboxFilters`
 * type (07-01) only exposes `slaBreached?: boolean` — there is no `sla` enum field.
 * The richer `SlaBucket` ('vencido'|'proximo'|'ok') is still exported + computed
 * here so the card and the filter UI can SHOW SLA status; the actual FILTER honors
 * the boolean `slaBreached` that the domain type defines (true ⇔ bucket 'vencido').
 */

import type {
  InboxFilters,
  MaintenanceTicketCard,
} from '@/lib/types/mantenimiento'

/** SLA status bucket derived from a deadline vs an injected `now`. */
export type SlaBucket = 'vencido' | 'proximo' | 'ok'

/** Cards whose SLA deadline is within this window (and not past) are `proximo`. */
const SLA_PROXIMO_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * "No filter on anything" — every field is undefined / empty array so
 * applyInboxFilters returns the full set. Used as the initial controlled state
 * in tickets/page.tsx and as the target of the "clear filters" action.
 */
export const EMPTY_FILTERS: InboxFilters = {
  severidad: [],
  categoria: [],
  estado: [],
  responsable: [],
  slaBreached: undefined,
  proveedor: undefined,
  propietario: undefined,
  inmueble: undefined,
  zona: undefined,
  requiereAprobacion: undefined,
  hasPhotos: undefined,
  reabierto: undefined,
  retencionRiesgo: undefined,
  costoMinCop: undefined,
  costoMaxCop: undefined,
}

/** Coerce a `Date | number` to epoch millis. */
function toMs(now: Date | number): number {
  return typeof now === 'number' ? now : now.getTime()
}

/**
 * Classify a card's SLA against an injected `now`:
 *   - vencido: deadline already past
 *   - proximo: deadline within the next 24h
 *   - ok:      deadline more than 24h away
 */
export function computeSlaBucket(
  card: MaintenanceTicketCard,
  now: Date | number,
): SlaBucket {
  const deadline = new Date(card.slaDeadlineAt).getTime()
  const ms = toMs(now)
  if (deadline < ms) return 'vencido'
  if (deadline - ms <= SLA_PROXIMO_WINDOW_MS) return 'proximo'
  return 'ok'
}

/**
 * Returns a NEW array sorted by `score` DESC. Ties break by `createdAt` DESC
 * (most recent first). Does not mutate the input.
 */
export function sortByScoreDesc(
  cards: readonly MaintenanceTicketCard[],
): MaintenanceTicketCard[] {
  return cards.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // tie → newest createdAt first (ISO desc)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/** Case-insensitive substring match; empty needle is treated as "no filter". */
function substringMatch(haystack: string | undefined, needle: string): boolean {
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase())
}

/**
 * Returns only the cards matching ALL active filters. Each filter that is
 * absent (empty array / undefined) is a no-op. `now` is injected for the SLA
 * predicate so the result is deterministic.
 */
export function applyInboxFilters(
  cards: readonly MaintenanceTicketCard[],
  filters: InboxFilters | undefined,
  now: Date | number,
): MaintenanceTicketCard[] {
  if (!filters) return cards.slice()
  const f = filters

  return cards.filter((c) => {
    // Multi-select dimensions: match if array empty OR includes the card value.
    if (f.severidad?.length && !f.severidad.includes(c.severidad)) return false
    if (f.categoria?.length && !f.categoria.includes(c.categoria)) return false
    if (f.estado?.length && !f.estado.includes(c.estado)) return false
    if (f.responsable?.length && !f.responsable.includes(c.responsableProbable)) return false

    // Boolean flags: undefined = no filter; otherwise strict equality.
    if (f.requiereAprobacion !== undefined && c.requiereAprobacion !== f.requiereAprobacion) return false
    if (f.hasPhotos !== undefined && c.hasPhotos !== f.hasPhotos) return false
    if (f.reabierto !== undefined && c.reabierto !== f.reabierto) return false
    if (
      f.retencionRiesgo !== undefined &&
      (c.retencionRiesgo ?? false) !== f.retencionRiesgo
    ) {
      return false
    }

    // SLA (boolean field on InboxFilters): true → only vencido; false → only not-vencido.
    if (f.slaBreached !== undefined) {
      const breached = computeSlaBucket(c, now) === 'vencido'
      if (breached !== f.slaBreached) return false
    }

    // Cost range: cards without a cost are excluded ONLY when a bound is set.
    if (f.costoMinCop !== undefined && (c.costoEstimadoCop ?? -Infinity) < f.costoMinCop) return false
    if (f.costoMaxCop !== undefined && (c.costoEstimadoCop ?? Infinity) > f.costoMaxCop) return false

    // Free-text filters (case-insensitive substring).
    if (f.proveedor && !substringMatch(c.proveedorSugerido, f.proveedor)) return false
    const fullAddress = `${c.inmueble.address} ${c.inmueble.unit ?? ''}`
    if (f.inmueble && !substringMatch(fullAddress, f.inmueble)) return false
    // `propietario` / `zona` are not card fields in the v1 mock (the real wire fills
    // them in); best-effort match against the address so the filter never throws.
    if (f.propietario && !substringMatch(c.inmueble.address, f.propietario)) return false
    if (f.zona && !substringMatch(c.inmueble.address, f.zona)) return false

    return true
  })
}

/** True when `filters` differs from EMPTY_FILTERS (any active filter). */
export function hasActiveFilters(filters: InboxFilters): boolean {
  return (
    (filters.severidad?.length ?? 0) > 0 ||
    (filters.categoria?.length ?? 0) > 0 ||
    (filters.estado?.length ?? 0) > 0 ||
    (filters.responsable?.length ?? 0) > 0 ||
    filters.slaBreached !== undefined ||
    filters.requiereAprobacion !== undefined ||
    filters.hasPhotos !== undefined ||
    filters.reabierto !== undefined ||
    filters.retencionRiesgo !== undefined ||
    filters.costoMinCop !== undefined ||
    filters.costoMaxCop !== undefined ||
    !!filters.proveedor ||
    !!filters.propietario ||
    !!filters.inmueble ||
    !!filters.zona
  )
}
