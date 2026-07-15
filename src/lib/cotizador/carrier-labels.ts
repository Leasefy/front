/**
 * carrier-labels — visión #12.
 *
 * Pure derivation of comparison "etiquetas" (labels) for an aseguradora row in
 * the matriz. The labels are NOT a backend signal: they are derived entirely
 * from the existing CarrierState fields (status, primaMensualCop, latencyMs,
 * condiciones) so they stay in sync with whatever the SSE stream produced — no
 * new endpoint, no new event.
 *
 * Two flavours:
 *   - `deriveCarrierLabels(carrier)` → labels that depend only on the single
 *     carrier (requiere_codeudor, no_recomendada).
 *   - `deriveCarrierLabelsForSet(carriers)` → labels that depend on the whole
 *     set (mas_rapida = global min latency among priced; menor_costo = global
 *     min prima among asegurables). Returns a Map keyed by carrier name so the
 *     matriz can look each row up in O(1).
 *
 * HONESTY: these are comparative guides over "Estimado · Prevalidación Leasefy"
 * data. mejor_cobertura / menor_friccion are only assigned when the carrier
 * actually exposes the supporting field — we never invent a coverage signal.
 */

import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'

export type CarrierLabel =
  | 'mas_rapida'
  | 'menor_costo'
  | 'mejor_cobertura'
  | 'menor_friccion'
  | 'requiere_codeudor'
  | 'no_recomendada'

/**
 * Optional fields a richer carrier verdict MAY carry once real insurer portals
 * are connected. CarrierState does not declare them today, so we read them
 * defensively and only act on them when present (never invented).
 */
interface CarrierExtras {
  coberturaScore?: number | null // 0..1 (higher = broader coverage)
  vigenciaMeses?: number | null
  confianza?: number | null // 0..1 backend confidence
}

function extras(carrier: CarrierState): CarrierExtras {
  const c = carrier as CarrierState & Partial<CarrierExtras>
  return {
    coberturaScore: c.coberturaScore ?? null,
    vigenciaMeses: c.vigenciaMeses ?? null,
    confianza: c.confianza ?? null,
  }
}

/** True when a condición mentions a codeudor / co-signer requirement. */
function condicionesRequiereCodeudor(condiciones: string[]): boolean {
  return condiciones.some(c => {
    const s = c.toLowerCase()
    return (
      s.includes('codeudor') ||
      s.includes('coddeudor') ||
      s.includes('co-deudor') ||
      s.includes('co deudor') ||
      s.includes('fiador') ||
      s.includes('coborrow') ||
      s.includes('co-borrow')
    )
  })
}

/** Is this carrier an "asegurable" priced result (approved/conditional)? */
function isPriced(carrier: CarrierState): boolean {
  return carrier.status === 'approved' || carrier.status === 'conditional'
}

/**
 * Single-carrier labels — independent of the rest of the set.
 *   - requiere_codeudor: any condición names a codeudor/fiador.
 *   - no_recomendada: the carrier rejected the candidate.
 *   - menor_friccion: approved (NOT conditional) with zero condiciones — the
 *     cleanest path that does not need anything resolved.
 */
export function deriveCarrierLabels(carrier: CarrierState): CarrierLabel[] {
  const out: CarrierLabel[] = []

  if (carrier.status === 'rejected') {
    out.push('no_recomendada')
    // A rejected carrier gets no positive comparative labels.
    return out
  }

  if (condicionesRequiereCodeudor(carrier.condiciones)) {
    out.push('requiere_codeudor')
  }

  if (carrier.status === 'approved' && carrier.condiciones.length === 0) {
    out.push('menor_friccion')
  }

  return out
}

/**
 * Set-aware labels: returns a Map<carrierName, CarrierLabel[]> combining the
 * single-carrier labels with the comparative (cross-set) ones:
 *   - mas_rapida: the priced carrier with the lowest finite latencyMs.
 *   - menor_costo: the asegurable carrier with the lowest finite prima.
 *   - mejor_cobertura: the priced carrier with the highest coberturaScore,
 *     ONLY when at least one carrier actually exposes coberturaScore.
 * Ties pick the first carrier in stable input order (deterministic).
 */
export function deriveCarrierLabelsForSet(
  carriers: CarrierState[],
): Map<string, CarrierLabel[]> {
  const map = new Map<string, CarrierLabel[]>()

  // Seed each carrier with its single-carrier labels.
  for (const c of carriers) {
    map.set(c.carrier, deriveCarrierLabels(c))
  }

  // --- mas_rapida: min latency among priced carriers ---
  let fastest: CarrierState | null = null
  for (const c of carriers) {
    if (!isPriced(c)) continue
    if (c.latencyMs == null || !Number.isFinite(c.latencyMs)) continue
    if (fastest == null || (c.latencyMs as number) < (fastest.latencyMs as number)) {
      fastest = c
    }
  }
  if (fastest) pushLabel(map, fastest.carrier, 'mas_rapida')

  // --- menor_costo: min prima among asegurables (approved only) ---
  let cheapest: CarrierState | null = null
  for (const c of carriers) {
    if (c.status !== 'approved') continue
    if (c.primaMensualCop == null || !Number.isFinite(c.primaMensualCop)) continue
    if (
      cheapest == null ||
      (c.primaMensualCop as number) < (cheapest.primaMensualCop as number)
    ) {
      cheapest = c
    }
  }
  if (cheapest) pushLabel(map, cheapest.carrier, 'menor_costo')

  // --- mejor_cobertura: max coberturaScore among priced (only if exposed) ---
  let broadest: CarrierState | null = null
  let broadestScore = -Infinity
  for (const c of carriers) {
    if (!isPriced(c)) continue
    const score = extras(c).coberturaScore
    if (score == null || !Number.isFinite(score)) continue
    if (score > broadestScore) {
      broadestScore = score
      broadest = c
    }
  }
  if (broadest) pushLabel(map, broadest.carrier, 'mejor_cobertura')

  return map
}

function pushLabel(
  map: Map<string, CarrierLabel[]>,
  carrier: string,
  label: CarrierLabel,
): void {
  const cur = map.get(carrier) ?? []
  if (!cur.includes(label)) cur.push(label)
  map.set(carrier, cur)
}
