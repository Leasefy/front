/**
 * assets.test.ts — data-level guard for the landing asset path constants.
 * Every asset extracted from `landing-standalone/index.html` (SLICE 2) must
 * resolve to a stable `/landing/**` path with explicit dimensions, so
 * `next/image` never lays out with CLS. Structural test only — no binary
 * asset content assertions.
 */
import { describe, it, expect } from 'vitest'
import {
  LANDING_TEXTURES,
  LANDING_CARD_GRAIN,
  LANDING_CARD_GRAIN_CONNECTED,
  LANDING_HERO_TEXTURE,
  LANDING_HERO_FALLBACK,
  LANDING_PHOTOS,
  LANDING_CLOSING,
  type TextureId,
} from './assets'

describe('LANDING_TEXTURES', () => {
  const textureIds: TextureId[] = ['t1', 't2', 't3', 't4', 't5', 't6', 't7']

  it('has an entry for every texture id t1-t7', () => {
    for (const id of textureIds) {
      expect(LANDING_TEXTURES[id]).toBeDefined()
    }
  })

  it('resolves each texture to a /landing/textures path with positive dimensions', () => {
    for (const id of textureIds) {
      const asset = LANDING_TEXTURES[id]
      expect(asset.src).toBe(`/landing/textures/${id}.webp`)
      expect(asset.width).toBeGreaterThan(0)
      expect(asset.height).toBeGreaterThan(0)
    }
  })
})

describe('card grain textures', () => {
  it('resolves the base and connected-state grain assets', () => {
    expect(LANDING_CARD_GRAIN.src).toBe('/landing/textures/card-grain.webp')
    expect(LANDING_CARD_GRAIN_CONNECTED.src).toBe('/landing/textures/card-grain-connected.webp')
  })
})

describe('hero assets', () => {
  it('resolves the shader hero texture and its no-WebGL fallback poster', () => {
    expect(LANDING_HERO_TEXTURE.src).toBe('/landing/hero/hero-texture.webp')
    expect(LANDING_HERO_FALLBACK.src).toBe('/landing/hero/hero-fallback.webp')
  })
})

describe('editorial photos', () => {
  it('resolves the hero product screenshot and founders portrait', () => {
    expect(LANDING_PHOTOS.heroScreenshot.src).toBe('/landing/photos/hero-screenshot.webp')
    expect(LANDING_PHOTOS.foundersPortofino.src).toBe('/landing/photos/founders-portofino.webp')
  })
})

describe('closing section assets', () => {
  it('resolves the backdrop photo and the single-source-of-truth closing WebP', () => {
    expect(LANDING_CLOSING.bannerBackdrop.src).toBe('/landing/closing/banner-backdrop.webp')
    expect(LANDING_CLOSING.cierre.src).toBe('/landing/closing/cierre.webp')
  })

  it('provides a small blurDataURL placeholder for the closing WebP (avoids CLS)', () => {
    expect(LANDING_CLOSING.cierre.blurDataURL).toMatch(/^data:image\/webp;base64,/)
    // must stay tiny — this is a blur placeholder, not the real asset
    expect(LANDING_CLOSING.cierre.blurDataURL.length).toBeLessThan(500)
  })
})
