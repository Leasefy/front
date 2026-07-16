/**
 * page.test.tsx — /productos/asegurabilidad thin route shell
 * (landing-react-port SLICE 5, T5.4). See crm/page.test.tsx for the
 * shared rationale.
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

import AsegurabilidadPage, { metadata } from './page'
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

describe('/productos/asegurabilidad page', () => {
  it('spreads landingRobots() into metadata.robots', () => {
    expect(metadata.robots).toEqual(landingRobots())
  })

  it('carries a unique title and description sourced from PRODUCTS.asegurabilidad', () => {
    expect(metadata.title).toBe(PRODUCTS.asegurabilidad.name)
    expect(metadata.description).toBe(PRODUCTS.asegurabilidad.lead)
  })

  it('renders the shared ProductPage template for the asegurabilidad slug', () => {
    act(() => {
      root.render(<AsegurabilidadPage />)
    })
    expect(container.querySelector('[data-testid="product-page"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="product-h1"]')?.textContent).toBe(
      PRODUCTS.asegurabilidad.h1,
    )
  })
})
