/**
 * LandingHeader.test.tsx — real navigation via Next <Link>, no hash
 * fragments, no pushState workaround (spec: Real Navigation). Structural
 * coverage: logo href, nav item hrefs, and pathname-derived active state.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const usePathnameMock = vi.fn(() => '/')
vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}))

import { LandingHeader } from './LandingHeader'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  usePathnameMock.mockReturnValue('/')
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('<LandingHeader>', () => {
  it('renders the logo linking to home', () => {
    act(() => {
      root.render(<LandingHeader />)
    })
    const logo = container.querySelector('[data-testid="landing-header-logo"]')
    expect(logo?.getAttribute('href')).toBe('/')
  })

  it('renders every nav link to a real route with no # fragment', () => {
    act(() => {
      root.render(<LandingHeader />)
    })
    const links = Array.from(container.querySelectorAll('nav a')) as HTMLAnchorElement[]
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      const href = link.getAttribute('href') ?? ''
      expect(href.startsWith('#')).toBe(false)
      expect(href.length).toBeGreaterThan(0)
    }
  })

  it('marks the nav link matching the current pathname as active', () => {
    usePathnameMock.mockReturnValue('/blog')
    act(() => {
      root.render(<LandingHeader />)
    })
    const activeLink = container.querySelector('nav a[href="/blog"]')
    expect(activeLink?.getAttribute('aria-current')).toBe('page')

    const inactiveLink = container.querySelector('nav a[href="/contacto"]')
    expect(inactiveLink?.getAttribute('aria-current')).toBeNull()
  })

  it('renders overlay-dark state by default and solid when forceSolid is set', () => {
    act(() => {
      root.render(<LandingHeader />)
    })
    expect(container.querySelector('header')?.getAttribute('data-state')).toBe('overlay-dark')

    act(() => {
      root.render(<LandingHeader forceSolid />)
    })
    expect(container.querySelector('header')?.getAttribute('data-state')).toBe('solid')
  })
})
