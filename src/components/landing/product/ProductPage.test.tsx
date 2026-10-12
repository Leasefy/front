/**
 * ProductPage.test.tsx — the shared product-page template
 * (landing-react-port SLICE 4b), ported from the standalone's
 * `#productPage` + `__renderProduct`. Structure/wiring only per Strict
 * TDD: copy sourcing from `PRODUCTS[slug]`, CTA hrefs, vignette/story/
 * capability/snapshot/step/night-log counts, and the closing composition
 * (sin banner de cierre ni pie viejo —ya borrados—, no cloning, no final CTA block).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, ...rest } = props
    return <img data-testid="next-image-mock" alt="" {...rest} />
  },
}))

import { ProductPage } from './ProductPage'
import { PRODUCTS, PRODUCT_SLUGS } from '@/lib/landing/products'
import { CAPTURAS } from '@/lib/landing/capturas'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('<ProductPage> — crm (detailed copy/wiring)', () => {
  beforeEach(() => {
    act(() => {
      root.render(<ProductPage slug="crm" />)
    })
  })

  it('renders the hero eyebrow, badge, h1 and lead from PRODUCTS[slug]', () => {
    const crm = PRODUCTS.crm
    expect(container.querySelector('[data-testid="product-eyebrow"]')?.textContent).toBe(crm.eyebrow)
    expect(container.querySelector('[data-testid="product-badge"]')?.textContent).toBe(crm.badge)
    expect(container.querySelector('[data-testid="product-h1"]')?.textContent).toBe(crm.h1)
    expect(container.querySelector('[data-testid="product-lead"]')?.textContent).toBe(crm.lead)
  })

  it('🔴 la portada es una pantalla REAL del panel, no una textura (Nico, 12-10-2026)', () => {
    // «donde haya imágenes que quieran representar algo del producto, sácalo
    // directamente del producto»: la portada borrosa con el índice se fue.
    expect(container.querySelector('[data-testid="product-cover"]')).toBeNull()
    const img = container.querySelector('[data-testid="product-window"] img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe(CAPTURAS.crm.portada.src)
    expect(img.getAttribute('alt')).toBe(CAPTURAS.crm.portada.alt)
  })

  it('renders both real CTA links, primary first, no # fragments', () => {
    const primary = container.querySelector('[data-testid="product-cta-primary"]') as HTMLAnchorElement
    const secondary = container.querySelector('[data-testid="product-cta-secondary"]') as HTMLAnchorElement
    expect(primary.getAttribute('href')).toBe(PRODUCTS.crm.ctas[0].href)
    expect(primary.textContent).toContain(PRODUCTS.crm.ctas[0].label)
    expect(secondary.getAttribute('href')).toBe(PRODUCTS.crm.ctas[1].href)
    expect(primary.getAttribute('href')?.startsWith('#')).toBe(false)
    expect(secondary.getAttribute('href')?.startsWith('#')).toBe(false)
  })

  it('ninguna viñeta dibujada a mano: todo lo que ilustra es una captura', () => {
    expect(container.querySelectorAll('[data-testid="vg-card"]').length).toBe(0)
  })

  it('cuenta las 3 historias sobre su pantalla real', () => {
    const stories = container.querySelectorAll('[data-testid="product-story"]')
    expect(stories.length).toBe(3)
    expect(stories[0].textContent).toContain(PRODUCTS.crm.stories[0].h3)
    // En el celular cada historia lleva su captura debajo.
    expect(stories[1].querySelector('img')?.getAttribute('src')).toBe(CAPTURAS.crm.recorrido[1].captura.src)
  })

  it('renders the snapshot rows, preserving verbatim inline <b> markup', () => {
    const rows = container.querySelectorAll('[data-testid="product-snapshot-row"]')
    expect(rows.length).toBe(PRODUCTS.crm.snapshot.length)
    const firstValue = rows[0].querySelector('.landing-pp__spec-value')
    expect(firstValue?.innerHTML).toContain('<b>')
  })

  it('renders 3 steps in order', () => {
    const steps = container.querySelectorAll('[data-testid="product-step"]')
    expect(steps.length).toBe(3)
    expect(steps[0].textContent).toContain(PRODUCTS.crm.steps[0].title)
  })

  it('de noche muestra la misma pantalla en el modo oscuro del panel, no un registro inventado', () => {
    const night = container.querySelector('[data-testid="product-night"]')
    expect(night?.textContent).toContain(PRODUCTS.crm.night.kicker)
    expect(night?.textContent).toContain(PRODUCTS.crm.night.quote)
    expect(container.querySelectorAll('[data-testid="product-night-log-time"]').length).toBe(0)
    expect(night?.querySelector('img')?.getAttribute('src')).toBe(CAPTURAS.crm.oscura.src)
  })

  it('cierra con la demo del producto y deja el pie al layout', () => {
    const cierre = container.querySelector('[data-testid="closing-banner"]')
    expect(cierre).toBeTruthy()
    // `demoPrompt` existía en el catálogo para los ocho productos y ninguna
    // pantalla lo mostraba; el cierre es su lugar.
    expect(container.querySelector('[data-testid="product-demo-prompt"]')?.textContent).toBe(PRODUCTS.crm.demoPrompt)
    const cta = cierre?.querySelector('[data-testid="closing-banner-cta"]')
    expect(cta?.getAttribute('href')).toBe(PRODUCTS.crm.ctas[0].href)
    // El pie lo pone el layout del grupo `(landing)`. Cuando ProductPage
    // traia el suyo ademas, /productos/* servia DOS <footer> — se veia como
    // uno solo porque el segundo quedaba abajo del primero.
    expect(container.querySelector('footer')).toBeNull()
  })

  it('cada capacidad lleva un recorte real de la pantalla', () => {
    const caps = container.querySelectorAll('[data-testid="product-capability"]')
    expect(caps.length).toBe(4)
    const recorte = caps[0].querySelector('[role="img"]') as HTMLElement
    expect(recorte.style.backgroundImage).toContain(CAPTURAS.crm.recortes[0].captura.src)
  })
})

describe('<ProductPage> — every product slug renders without error', () => {
  it.each(PRODUCT_SLUGS)('renders %s with matching structural counts', (slug) => {
    act(() => {
      root.render(<ProductPage slug={slug} />)
    })
    const product = PRODUCTS[slug]
    expect(container.querySelector('[data-testid="product-h1"]')?.textContent).toBe(product.h1)
    // La portada es la captura real de ESE producto.
    expect(container.querySelector('[data-testid="product-window"] img')?.getAttribute('src')).toBe(CAPTURAS[slug].portada.src)
    expect(container.querySelectorAll('[data-testid="product-story"]').length).toBe(product.stories.length)
    expect(container.querySelectorAll('[data-testid="product-capability"]').length).toBe(
      product.capabilities.length,
    )
    expect(container.querySelectorAll('[data-testid="product-snapshot-row"]').length).toBe(
      product.snapshot.length,
    )
    expect(container.querySelectorAll('[data-testid="product-step"]').length).toBe(product.steps.length)
    expect(container.querySelector('[data-testid="product-night"] img')?.getAttribute('src')).toBe(CAPTURAS[slug].oscura.src)
  })
})
