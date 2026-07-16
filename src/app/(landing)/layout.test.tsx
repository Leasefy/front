/**
 * layout.test.tsx — landing route-group layout. Scoped Inter Tight +
 * IBM Plex Mono load via next/font/google onto a WRAPPER <div>, never
 * <html> (spec: Scoped Landing Typography) — that is what keeps Cadence
 * fonts (Schibsted Grotesk + JetBrains Mono) intact on every other route.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// next/font/google is a build-time-only module (empty at runtime outside
// the Next.js SWC compiler) — mock it with the shape NextFont normally
// returns: { className, variable, style }.
vi.mock('next/font/google', () => ({
  Inter_Tight: (opts: { variable?: string }) => ({
    className: 'mock-inter-tight',
    variable: opts.variable ?? '--font-inter-tight',
    style: { fontFamily: 'mock-inter-tight' },
  }),
  IBM_Plex_Mono: (opts: { variable?: string }) => ({
    className: 'mock-ibm-plex-mono',
    variable: opts.variable ?? '--font-ibm-plex-mono',
    style: { fontFamily: 'mock-ibm-plex-mono' },
  }),
}))

const usePathnameMock = vi.fn(() => '/landing-preview')
vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}))

import LandingLayout from './layout'

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

describe('<LandingLayout>', () => {
  it('renders a wrapper div carrying both scoped font-variable classes', () => {
    act(() => {
      root.render(
        <LandingLayout>
          <p data-testid="page-content">contenido</p>
        </LandingLayout>,
      )
    })
    const wrapper = container.querySelector('[data-testid="landing-scope"]')
    expect(wrapper).toBeTruthy()
    expect(wrapper?.className).toContain('--font-inter-tight')
    expect(wrapper?.className).toContain('--font-ibm-plex-mono')
  })

  it('never renders an <html> element — scoping stays inside the wrapper', () => {
    act(() => {
      root.render(
        <LandingLayout>
          <p>contenido</p>
        </LandingLayout>,
      )
    })
    expect(container.querySelector('html')).toBeNull()
  })

  it('bridges the --night CSS var used by the eclipse orb (no gradient allowed there)', () => {
    act(() => {
      root.render(
        <LandingLayout>
          <p>contenido</p>
        </LandingLayout>,
      )
    })
    const wrapper = container.querySelector('[data-testid="landing-scope"]') as HTMLElement
    expect(wrapper.style.getPropertyValue('--night')).toBe('#080808')
  })

  it('renders header, children, and footer inside the scoped wrapper', () => {
    act(() => {
      root.render(
        <LandingLayout>
          <p data-testid="page-content">contenido</p>
        </LandingLayout>,
      )
    })
    const wrapper = container.querySelector('[data-testid="landing-scope"]')
    expect(wrapper?.querySelector('header')).toBeTruthy()
    expect(wrapper?.querySelector('footer')).toBeTruthy()
    expect(wrapper?.querySelector('[data-testid="page-content"]')?.textContent).toBe('contenido')
  })
})
