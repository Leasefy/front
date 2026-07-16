/**
 * legacy-redirects.data.mjs — plain-ESM data source for the SLICE 8 301
 * map. Split out from `legacy-redirects.ts` for one reason only: Next.js
 * 14.2 does not support `next.config.ts` (that landed in Next 15), and
 * `next.config.mjs` runs under plain Node ESM with no TypeScript loader —
 * it cannot `import` a `.ts` module directly. A `.mjs` file has no type
 * syntax to strip, so both consumers (`next.config.mjs` at build time and
 * `legacy-redirects.ts` at type-check/test time) import this single
 * source of truth. See `legacy-redirects.ts` for the typed re-export, full
 * mapping rationale, and the unit test covering this table.
 */
export const LEGACY_PRODUCT_REDIRECTS_DATA = [
  { source: '/productos/evaluacion', destination: '/productos/inquilino', permanent: true },
  { source: '/productos/pagos', destination: '/productos/cobranza', permanent: true },
  { source: '/productos/contratos', destination: '/productos/crm', permanent: true },
  { source: '/productos/aplicaciones', destination: '/productos/matching', permanent: true },
  { source: '/productos/seguro', destination: '/productos/asegurabilidad', permanent: true },
  { source: '/productos/api', destination: '/', permanent: true },
]
