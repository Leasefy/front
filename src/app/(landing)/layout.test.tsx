/**
 * layout.test.tsx — landing route-group layout. Scoped Inter Tight +
 * IBM Plex Mono load via next/font/google onto a WRAPPER <div>, never
 * <html> (spec: Scoped Landing Typography) — that is what keeps Cadence
 * fonts (Schibsted Grotesk + JetBrains Mono) intact on every other route.
 *
 * F1 (landing-react-port final integration): the v2 home (`/`) renders its
 * OWN header/footer (LandingHome's markup is a 1:1 port of the standalone
 * index.html, self-contained). The shared chrome must NOT render on `/` to
 * avoid a double header/footer — every other route in this group still gets it.
 *
 * 2026-09-05: ese chrome compartido ES el del home — `LandingChrome`
 * (header v2) y `LandingFooterV2`—, no el par viejo de `landing/layout/`.
 * Los dos ultimos tests lo fijan por marcas propias del v2 (`#hdr`, `.fgrid2`)
 * y no por la etiqueta `<header>`, que ambos pares cumplian por igual.
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
  Inter: (opts: { variable?: string }) => ({
    className: 'mock-inter',
    variable: opts.variable ?? '--font-inter',
    style: { fontFamily: 'mock-inter' },
  }),
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

// El header v2 decide que enlaces muestra segun quien mira, asi que sin
// esto `useAuth()` revienta y el layout entero no monta.
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false, user: null, activeContext: null }),
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

  it('loads Inter (variable class) without changing the old landing --fb bridge (Inter Tight, ADR-2)', () => {
    act(() => {
      root.render(
        <LandingLayout>
          <p>contenido</p>
        </LandingLayout>,
      )
    })
    const wrapper = container.querySelector('[data-testid="landing-scope"]') as HTMLElement
    // --fb stays Inter Tight at this level — the v2 home overrides it
    // locally on `.lv2` (see (landing)/page.tsx), never here.
    expect(wrapper.style.getPropertyValue('--fb')).toContain('--font-inter-tight')
    expect(wrapper.style.getPropertyValue('--fd')).toContain('--font-inter-tight')
    expect(wrapper.style.getPropertyValue('--fm')).toContain('--font-ibm-plex-mono')
    expect(wrapper.className).toContain('--font-inter')
  })

  it('does NOT render the shared chrome on the v2 home route (/) — LandingHome supplies its own', () => {
    usePathnameMock.mockReturnValue('/')
    act(() => {
      root.render(
        <LandingLayout>
          <p data-testid="page-content">contenido</p>
        </LandingLayout>,
      )
    })
    const wrapper = container.querySelector('[data-testid="landing-scope"]')
    expect(wrapper?.querySelector('header')).toBeNull()
    expect(wrapper?.querySelector('footer')).toBeNull()
    expect(wrapper?.querySelector('[data-testid="page-content"]')?.textContent).toBe('contenido')
  })

  it('renders the SAME chrome as the home on internal routes (header v2 + pie v2)', () => {
    usePathnameMock.mockReturnValue('/blog')
    act(() => {
      root.render(
        <LandingLayout>
          <p>contenido</p>
        </LandingLayout>,
      )
    })
    const wrapper = container.querySelector('[data-testid="landing-scope"]')
    // `#hdr` y `.fgrid2` son del port v2. El par viejo también traía
    // <header>/<footer>, así que preguntar por la etiqueta no distinguía
    // nada: es justo lo que dejó al blog con otro logo y otro pie.
    expect(wrapper?.querySelector('header#hdr')).toBeTruthy()
    expect(wrapper?.querySelector('footer .fgrid2')).toBeTruthy()
    expect(wrapper?.querySelector('[data-testid="landing-chrome"]')).toBeTruthy()
  })

  it('marca el enlace del nav que corresponde a la ruta', () => {
    usePathnameMock.mockReturnValue('/blog')
    act(() => {
      root.render(
        <LandingLayout>
          <p>contenido</p>
        </LandingLayout>,
      )
    })
    const actual = container.querySelector('nav.main [aria-current="page"]')
    expect(actual?.textContent).toContain('Blog')
  })
})
