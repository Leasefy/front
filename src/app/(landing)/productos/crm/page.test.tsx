/**
 * page.test.tsx — /productos/crm thin route shell (landing-react-port
 * SLICE 5, T5.1). Structure/wiring only per Strict TDD: metadata carries
 * `landingRobots()` (noindex while LANDING_STAGE is true) + a unique
 * title/description sourced from `PRODUCTS.crm`, and the page renders the
 * shared `<ProductPage slug="crm">` template.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, ...rest } = props
    return <img data-testid="next-image-mock" alt="" {...rest} />
  },
}))

import CrmPage, { metadata } from './page'
import { landingRobots } from '@/lib/landing/landing-stage'
import { PRODUCTS } from '@/lib/landing/products'

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

describe('/productos/crm page', () => {
  it('spreads landingRobots() into metadata.robots', () => {
    expect(metadata.robots).toEqual(landingRobots())
  })

  it('carries a unique title and description sourced from PRODUCTS.crm', () => {
    expect(metadata.title).toBe(PRODUCTS.crm.name)
    expect(metadata.description).toBe(PRODUCTS.crm.lead)
  })

  it('renders the shared ProductPage template for the crm slug', () => {
    act(() => {
      root.render(<CrmPage />)
    })
    expect(container.querySelector('[data-testid="product-page"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="product-h1"]')?.textContent).toBe(PRODUCTS.crm.h1)
  })
})
