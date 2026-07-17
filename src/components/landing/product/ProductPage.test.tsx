/**
 * ProductPage.test.tsx — the shared product-page template
 * (landing-react-port SLICE 4b), ported from the standalone's
 * `#productPage` + `__renderProduct`. Structure/wiring only per Strict
 * TDD: copy sourcing from `PRODUCTS[slug]`, CTA hrefs, vignette/story/
 * capability/snapshot/step/night-log counts, and the closing composition
 * (ClosingBanner + LandingFooter, no cloning, no final CTA block).
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
import { LANDING_TEXTURES } from '@/lib/landing/assets'

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

  it('renders the cover with the product texture and name', () => {
    const cover = container.querySelector('[data-testid="product-cover"]') as HTMLElement
    expect(cover.style.backgroundImage).toContain(LANDING_TEXTURES[PRODUCTS.crm.textureId].src)
    expect(cover.textContent).toContain(PRODUCTS.crm.name)
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

  it('renders one VignetteRenderer (vg-card) per window vignette', () => {
    const cards = container.querySelectorAll('[data-testid="product-window"] [data-testid="vg-card"]')
    expect(cards.length).toBe(PRODUCTS.crm.window.vignettes.length)
  })

  it('renders 3 stories, alternating the --alt modifier on odd indices', () => {
    const stories = container.querySelectorAll('[data-testid="product-story"]')
    expect(stories.length).toBe(3)
    expect(stories[0].className).not.toContain('landing-pp__story--alt')
    expect(stories[1].className).toContain('landing-pp__story--alt')
    expect(stories[2].className).not.toContain('landing-pp__story--alt')
    expect(stories[0].textContent).toContain(PRODUCTS.crm.stories[0].h3)
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

  it('renders the night panel with kicker, quote and every log entry', () => {
    const night = container.querySelector('[data-testid="product-night"]')
    expect(night?.textContent).toContain(PRODUCTS.crm.night.kicker)
    expect(night?.textContent).toContain(PRODUCTS.crm.night.quote)
    const logTimes = container.querySelectorAll('[data-testid="product-night-log-time"]')
    expect(logTimes.length).toBe(PRODUCTS.crm.night.log.length)
    expect(logTimes[0].textContent).toBe(PRODUCTS.crm.night.log[0].time)
  })

  it('renders the closing banner and footer directly (no cloning, no final CTA block)', () => {
    expect(container.querySelector('[data-testid="closing-banner"]')).toBeTruthy()
    expect(container.querySelector('footer.landing-footer')).toBeTruthy()
  })
})

describe('<ProductPage> — every product slug renders without error', () => {
  it.each(PRODUCT_SLUGS)('renders %s with matching structural counts', (slug) => {
    act(() => {
      root.render(<ProductPage slug={slug} />)
    })
    const product = PRODUCTS[slug]
    expect(container.querySelector('[data-testid="product-h1"]')?.textContent).toBe(product.h1)
    expect(container.querySelectorAll('[data-testid="product-window"] [data-testid="vg-card"]').length).toBe(
      product.window.vignettes.length,
    )
    expect(container.querySelectorAll('[data-testid="product-story"]').length).toBe(product.stories.length)
    expect(container.querySelectorAll('[data-testid="product-capability"]').length).toBe(
      product.capabilities.length,
    )
    expect(container.querySelectorAll('[data-testid="product-snapshot-row"]').length).toBe(
      product.snapshot.length,
    )
    expect(container.querySelectorAll('[data-testid="product-step"]').length).toBe(product.steps.length)
    expect(container.querySelectorAll('[data-testid="product-night-log-time"]').length).toBe(
      product.night.log.length,
    )
  })
})
