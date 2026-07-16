/**
 * Typed asset path constants for the landing-react-port (SLICE 2).
 *
 * Every raster asset that used to be a base64 `data:` URI inline inside
 * `landing-standalone/index.html` now lives under `public/landing/**` and
 * is referenced here through a typed constant — no component should ever
 * hardcode a `/landing/**` path string directly.
 *
 * Provenance (source line numbers refer to the original standalone
 * `index.html` inline blobs, kept here for traceability during the port):
 * - `t1`..`t7`: copied verbatim from the loose, already-optimized
 *   `landing-standalone/assets/textures/u-t1..u-t7.webp` files (byte-identical
 *   to the redundant inline @451-457 blobs — confirmed via sha256 diff).
 * - `LANDING_CARD_GRAIN` / `LANDING_CARD_GRAIN_CONNECTED`: the `.lcv` card
 *   widget's decorative grain background (base + "connected" crossfade
 *   state). Originally inline @407 and @1013 — NOT hero texture or photos
 *   as an earlier line-number guess assumed; confirmed via DOM context
 *   (`.lbg`/`.lbg2` inside `#lwrap .lcv`).
 * - `LANDING_HERO_TEXTURE`: the WebGL shader's grain texture, loaded via
 *   `img.src` in the standalone. Byte-identical (sha256) to the loose
 *   `assets/textures/hero-texture.jpg` — inline @3282, not @407 as an
 *   earlier line-number guess assumed.
 * - `LANDING_HERO_FALLBACK`: the shader hero's no-WebGL / reduced-motion
 *   static poster (inline @3124, used as a JS-set CSS background when
 *   `canvas.getContext('webgl')` returns null).
 * - `LANDING_PHOTOS.heroScreenshot`: the hero's app-screenshot frame
 *   (inline @1893, `.hfwrap .hframe img`).
 * - `LANDING_PHOTOS.foundersPortofino`: the founders' testimonial portrait
 *   (inline @2619, `.tframe .tpimg`).
 * - `LANDING_CLOSING.bannerBackdrop`: the closing section's animated
 *   Ken-Burns backdrop photo (inline @824, `.banner-photo`).
 * - `LANDING_CLOSING.cierre`: the ~11MB closing WebP still (inline @2690,
 *   `.banner-video#bvid`) — single source of truth, copied verbatim with
 *   no re-encode per design ADR-7. Rendered lazily (never `priority`) since
 *   it sits at the end of a long scroll narrative, not the initial LCP.
 */

export type TextureId = 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 't7'

export interface LandingAsset {
  src: string
  width: number
  height: number
}

export interface LandingAssetWithBlur extends LandingAsset {
  blurDataURL: string
}

export const LANDING_TEXTURES: Record<TextureId, LandingAsset> = {
  t1: { src: '/landing/textures/t1.webp', width: 1600, height: 1600 },
  t2: { src: '/landing/textures/t2.webp', width: 1600, height: 1600 },
  t3: { src: '/landing/textures/t3.webp', width: 1600, height: 1600 },
  t4: { src: '/landing/textures/t4.webp', width: 1600, height: 1600 },
  t5: { src: '/landing/textures/t5.webp', width: 1600, height: 1600 },
  t6: { src: '/landing/textures/t6.webp', width: 1600, height: 1600 },
  t7: { src: '/landing/textures/t7.webp', width: 1600, height: 1600 },
}

export const LANDING_CARD_GRAIN: LandingAsset = {
  src: '/landing/textures/card-grain.webp',
  width: 900,
  height: 900,
}

export const LANDING_CARD_GRAIN_CONNECTED: LandingAsset = {
  src: '/landing/textures/card-grain-connected.webp',
  width: 900,
  height: 675,
}

export const LANDING_HERO_TEXTURE: LandingAsset = {
  src: '/landing/hero/hero-texture.webp',
  width: 1080,
  height: 1080,
}

export const LANDING_HERO_FALLBACK: LandingAsset = {
  src: '/landing/hero/hero-fallback.webp',
  width: 480,
  height: 480,
}

export const LANDING_PHOTOS = {
  heroScreenshot: {
    src: '/landing/photos/hero-screenshot.webp',
    width: 1600,
    height: 953,
  } satisfies LandingAsset,
  foundersPortofino: {
    src: '/landing/photos/founders-portofino.webp',
    width: 1200,
    height: 1200,
  } satisfies LandingAsset,
} as const

export const LANDING_CLOSING = {
  bannerBackdrop: {
    src: '/landing/closing/banner-backdrop.webp',
    width: 2000,
    height: 1333,
  } satisfies LandingAsset,
  // Tiny (~90 byte) blur placeholder generated once at asset-build time from
  // the real closing WebP — never regenerate at runtime (would require
  // reading the 8MB source file from the client).
  cierre: {
    src: '/landing/closing/cierre.webp',
    width: 1600,
    height: 900,
    blurDataURL:
      'data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAADQAQCdASoMAAcAA4BaJQBOgBnOxzN/AADOPlLvKfdHpYKkkck020Qu2WOm/7ud/YPM6yeNGpDjIJ84nbjIfyIGz3sPEAAA',
  } satisfies LandingAssetWithBlur,
} as const
