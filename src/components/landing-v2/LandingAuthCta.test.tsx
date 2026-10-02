/**
 * LandingAuthCta.test.tsx — landing header/mobile-menu auth CTA.
 *
 * Bug fix: the static anchor in LandingHome.tsx was a hardcoded absolute
 * `http://localhost:3001/auth` link with `target="_blank"`, and never
 * reflected an existing session. This component:
 *  - renders "Iniciar sesión" -> /auth (same tab, no target) when logged out
 *    or while auth is still loading (deterministic SSR-safe initial state)
 *  - renders "Ir al panel" -> the role's panel route when authenticated
 */

import * as React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const mockUseAuth = vi.fn()

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}))

import { LandingAuthCta } from './LandingAuthCta'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
})

function render(props: React.ComponentProps<typeof LandingAuthCta>) {
  act(() => { root.render(<LandingAuthCta {...props} />) })
}

describe('<LandingAuthCta>', () => {
  it('renders "Iniciar sesión" -> /auth (same tab) when logged out', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false })
    render({ variant: 'header' })
    const anchor = container.querySelector('a')!
    expect(anchor.textContent).toBe('Iniciar sesión')
    expect(anchor.getAttribute('href')).toBe('/auth')
    expect(anchor.getAttribute('target')).toBeNull()
  })

  // QA 01-10-2026: los botones cambiaban solos segundos después de cargar.
  // Mientras la sesión no se sabe no se pinta NINGÚN botón de sesión: un hueco
  // invisible del mismo tamaño (las mismas clases), sin enlace ni texto leíble.
  it.each([
    ['sin usuario', { user: null, isAuthenticated: false }],
    ['con un usuario en el contexto', { user: { role: 'agency' }, isAuthenticated: true }],
  ])('mientras carga (%s) deja un hueco invisible, no «Iniciar sesión» ni «Ir al panel»', (_caso, estado) => {
    mockUseAuth.mockReturnValue({ ...estado, isLoading: true })
    render({ variant: 'header' })
    expect(container.querySelector('a')).toBeNull()
    const hueco = container.querySelector('[data-testid="hueco-de-boton-de-sesion"]') as HTMLElement
    expect(hueco).not.toBeNull()
    expect(hueco.getAttribute('aria-hidden')).toBe('true')
    expect(hueco.style.visibility).toBe('hidden')
    expect(hueco.className).toBe('btn outline sm')
  })

  it('renders "Ir al panel" -> /panel/inmobiliaria/piloto for an authenticated agency user', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'agency' }, isAuthenticated: true, isLoading: false })
    render({ variant: 'header' })
    const anchor = container.querySelector('a')!
    expect(anchor.textContent).toBe('Ir al panel')
    expect(anchor.getAttribute('href')).toBe('/panel/inmobiliaria/piloto')
    expect(anchor.getAttribute('target')).toBeNull()
  })

  it('renders "Ir al panel" -> /panel for an authenticated landlord user', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'landlord' }, isAuthenticated: true, isLoading: false })
    render({ variant: 'header' })
    const anchor = container.querySelector('a')!
    expect(anchor.getAttribute('href')).toBe('/panel')
  })

  it('renders "Ir al panel" -> /inquilino for an authenticated tenant user', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'tenant' }, isAuthenticated: true, isLoading: false })
    render({ variant: 'header' })
    const anchor = container.querySelector('a')!
    expect(anchor.getAttribute('href')).toBe('/inquilino')
  })

  it('applies the mobile variant classes (btn outline lg) to keep pixel parity', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false })
    render({ variant: 'mobile' })
    const anchor = container.querySelector('a')!
    expect(anchor.className).toBe('btn outline lg')
  })

  it('applies the header variant classes (btn outline sm) by default', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false })
    render({ variant: 'header' })
    const anchor = container.querySelector('a')!
    expect(anchor.className).toBe('btn outline sm')
  })
})
