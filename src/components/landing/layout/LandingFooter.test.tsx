/**
 * LandingFooter.test.tsx — real navigation via Next <Link> for internal
 * routes (product taxonomy, blog, contact), no hash fragments. `mailto:`
 * and external links are allowed (spec: Real Navigation only forbids
 * hash-based routing).
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { LandingFooter } from './LandingFooter'

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

describe('<LandingFooter>', () => {
  it('renders product links pointing at the new /productos/{slug} taxonomy', () => {
    act(() => {
      root.render(<LandingFooter />)
    })
    const crmLink = container.querySelector('a[href="/productos/crm"]')
    const erpLink = container.querySelector('a[href="/productos/erp"]')
    expect(crmLink).toBeTruthy()
    expect(erpLink).toBeTruthy()
  })

  it('renders blog and contact links with no # fragment', () => {
    act(() => {
      root.render(<LandingFooter />)
    })
    const blogLink = container.querySelector('a[href="/blog"]')
    const contactLink = container.querySelector('a[href="/contacto"]')
    expect(blogLink).toBeTruthy()
    expect(contactLink).toBeTruthy()
  })

  it('renders a mailto support link', () => {
    act(() => {
      root.render(<LandingFooter />)
    })
    const supportLink = container.querySelector('a[href^="mailto:"]')
    expect(supportLink).toBeTruthy()
  })

  it('renders no hash-fragment links anywhere in the footer', () => {
    act(() => {
      root.render(<LandingFooter />)
    })
    const links = Array.from(container.querySelectorAll('a')) as HTMLAnchorElement[]
    for (const link of links) {
      expect(link.getAttribute('href')?.startsWith('#')).toBe(false)
    }
  })
})
