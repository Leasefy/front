/**
 * legacy-redirects.test.ts — data-level guard for the SLICE 8 301 map.
 * Asserts every retired `/productos/*` slug is covered, every target
 * resolves to a route that actually exists in the new taxonomy (or `/`),
 * and every entry is `permanent: true` (SEO-safe 301, never 302).
 */
import { describe, it, expect } from 'vitest'
import { LEGACY_PRODUCT_REDIRECTS } from './legacy-redirects'
import { PRODUCT_SLUGS } from './products'

const OLD_SLUGS = ['evaluacion', 'pagos', 'contratos', 'aplicaciones', 'seguro', 'api'] as const

describe('LEGACY_PRODUCT_REDIRECTS', () => {
  it('covers all 6 retired /productos/* slugs, one entry each', () => {
    expect(LEGACY_PRODUCT_REDIRECTS).toHaveLength(OLD_SLUGS.length)
    const sources = LEGACY_PRODUCT_REDIRECTS.map((r) => r.source)
    for (const slug of OLD_SLUGS) {
      expect(sources).toContain(`/productos/${slug}`)
    }
  })

  it('every destination is a live route: a current PRODUCT_SLUGS page or home', () => {
    for (const redirect of LEGACY_PRODUCT_REDIRECTS) {
      const isProductRoute = PRODUCT_SLUGS.some((slug) => redirect.destination === `/productos/${slug}`)
      const isHome = redirect.destination === '/'
      expect(isProductRoute || isHome).toBe(true)
    }
  })

  it('every entry is a permanent (301) redirect', () => {
    for (const redirect of LEGACY_PRODUCT_REDIRECTS) {
      expect(redirect.permanent).toBe(true)
    }
  })

  it('maps each retired slug to its documented nearest equivalent', () => {
    const bySource = Object.fromEntries(LEGACY_PRODUCT_REDIRECTS.map((r) => [r.source, r.destination]))
    expect(bySource['/productos/evaluacion']).toBe('/productos/inquilino')
    expect(bySource['/productos/pagos']).toBe('/productos/cobranza')
    expect(bySource['/productos/contratos']).toBe('/productos/crm')
    expect(bySource['/productos/aplicaciones']).toBe('/productos/matching')
    expect(bySource['/productos/seguro']).toBe('/productos/asegurabilidad')
    // `api` has no honest new-taxonomy equivalent (no bare /productos index
    // page exists) — redirects to home per design's documented alternative
    // ("`api` -> `/productos` (or home)") to avoid a 301-to-404.
    expect(bySource['/productos/api']).toBe('/')
  })
})
