/**
 * legacy-redirects.ts — SLICE 8 301 map for the retired `/productos/*`
 * taxonomy (evaluacion/pagos/contratos/aplicaciones/seguro/api), replaced
 * by the new 8-product taxonomy (crm, erp + 6 AI agents) per decision #258
 * ("Taxonomy: new 8-product taxonomy ... replaces old /productos/* with
 * 301 redirects"). Exported as data so `next.config.mjs` `redirects()`
 * consumes it directly and the mapping table is unit-testable without a
 * running Next.js server (design §5 "301 redirects").
 *
 * Mapping rationale (nearest equivalent by page content, read during S8
 * apply):
 * - evaluacion -> inquilino: old page was tenant credit/background scoring;
 *   new `inquilino` agent page covers the same "verificar inquilinos" job.
 * - pagos -> cobranza: old page was PSE/card/cash collection; new
 *   `cobranza` agent page owns automated collection.
 * - contratos -> crm: old page was digital contract signing; no dedicated
 *   contracts agent exists in the new taxonomy, so it lands on `crm`
 *   (the system-of-record module that owns contract lifecycle data).
 * - aplicaciones -> matching: old page was online applications/candidates;
 *   new `matching` agent owns application/candidate matching.
 * - seguro -> asegurabilidad: old page was rent-default insurance; new
 *   `asegurabilidad` agent is the direct rename/rebrand of that job.
 * - api -> `/` (home): old page was a "coming soon" developer API page with
 *   no shipped functionality and no equivalent in the new taxonomy. Design
 *   (§5) explicitly allows `/productos` OR home for this slug; `/productos`
 *   has no bare index page in the new tree (only 8 slug sub-routes), so
 *   redirecting there would itself 301-to-404. Home avoids that dead end.
 *
 * All entries are `permanent: true` (real 301s — the old taxonomy is
 * retired, not temporarily moved).
 */
export interface LegacyRedirect {
  source: string
  destination: string
  permanent: boolean
}

export const LEGACY_PRODUCT_REDIRECTS: LegacyRedirect[] = [
  { source: '/productos/evaluacion', destination: '/productos/inquilino', permanent: true },
  { source: '/productos/pagos', destination: '/productos/cobranza', permanent: true },
  { source: '/productos/contratos', destination: '/productos/crm', permanent: true },
  { source: '/productos/aplicaciones', destination: '/productos/matching', permanent: true },
  { source: '/productos/seguro', destination: '/productos/asegurabilidad', permanent: true },
  { source: '/productos/api', destination: '/', permanent: true },
]
