/**
 * products.test.ts — data-level guard for the typed PRODUCTS catalog
 * (landing-react-port SLICE 4a). Structure/wiring only, per Strict TDD:
 * asserts every slug is present with the fields `ProductPage` (S4b) will
 * need, that CTA hrefs point to real routes (not `#` anchors — spec: Real
 * Navigation), and that every vignette carries a valid `VignetteFamily`.
 */
import { describe, it, expect } from 'vitest'
import { PRODUCTS, PRODUCT_SLUGS } from './products'
import type { ProductSlug } from './types'

const EXPECTED_SLUGS: ProductSlug[] = [
  'crm',
  'erp',
  'cobranza',
  'inquilino',
  'avaluos',
  'conciliacion',
  'matching',
  'asegurabilidad',
]

describe('PRODUCT_SLUGS', () => {
  it('lists all 8 product slugs', () => {
    expect(PRODUCT_SLUGS).toHaveLength(8)
    expect([...PRODUCT_SLUGS].sort()).toEqual([...EXPECTED_SLUGS].sort())
  })
})

describe('PRODUCTS', () => {
  it('has an entry for every slug', () => {
    for (const slug of EXPECTED_SLUGS) {
      expect(PRODUCTS[slug]).toBeDefined()
      expect(PRODUCTS[slug].slug).toBe(slug)
    }
  })

  it('every product has non-empty h1, lead, ctas, snapshot, and steps', () => {
    for (const slug of EXPECTED_SLUGS) {
      const product = PRODUCTS[slug]
      expect(product.h1.length).toBeGreaterThan(0)
      expect(product.lead.length).toBeGreaterThan(0)
      expect(product.ctas.length).toBeGreaterThan(0)
      expect(product.snapshot.length).toBeGreaterThan(0)
      expect(product.steps.length).toBeGreaterThan(0)
    }
  })

  it('every CTA href points to a real route, never a `#` fragment', () => {
    for (const slug of EXPECTED_SLUGS) {
      for (const cta of PRODUCTS[slug].ctas) {
        expect(cta.href.startsWith('#')).toBe(false)
        expect(cta.href.startsWith('/')).toBe(true)
      }
    }
  })

  it('every product window has at least one vignette with a valid family', () => {
    const validFamilies = ['sys', 'ag', 'chat']
    for (const slug of EXPECTED_SLUGS) {
      const win = PRODUCTS[slug].window
      expect(win.vignettes.length).toBeGreaterThan(0)
      for (const v of win.vignettes) {
        expect(validFamilies).toContain(v.header.family)
      }
    }
  })

  it('every product has exactly 3 stories, each with its own vignette', () => {
    for (const slug of EXPECTED_SLUGS) {
      const stories = PRODUCTS[slug].stories
      expect(stories).toHaveLength(3)
      for (const story of stories) {
        expect(story.vignette).toBeDefined()
        expect(story.h3.length).toBeGreaterThan(0)
      }
    }
  })

  it('textureId matches the standalone TEXOF mapping', () => {
    expect(PRODUCTS.crm.textureId).toBe('t2')
    expect(PRODUCTS.erp.textureId).toBe('t5')
    expect(PRODUCTS.cobranza.textureId).toBe('t1')
    expect(PRODUCTS.inquilino.textureId).toBe('t4')
    expect(PRODUCTS.avaluos.textureId).toBe('t7')
    expect(PRODUCTS.conciliacion.textureId).toBe('t6')
    expect(PRODUCTS.matching.textureId).toBe('t3')
    expect(PRODUCTS.asegurabilidad.textureId).toBe('t6')
  })

  it('uses distinct vignette kinds across each product window (per HANDOFF §PRODUCTS v3)', () => {
    for (const slug of EXPECTED_SLUGS) {
      const kinds = PRODUCTS[slug].window.vignettes.map((v) => v.kind)
      expect(new Set(kinds).size).toBe(kinds.length)
    }
  })
})
