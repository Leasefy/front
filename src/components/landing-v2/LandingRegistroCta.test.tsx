/**
 * LandingRegistroCta.test.tsx — landing "Empezar ahora" CTA.
 *
 * Sends logged-out users to /auth in create-account mode (the profile picker).
 * It used to point at /registro, which is the invitation-completion flow and
 * fails without an invitationToken ("Invitación inválida").
 *
 * Session-aware, like its LandingAuthCta sibling — a logged-in user must never
 * hit the register flow. This component:
 *  - header/mobile variants: render normally when logged out (or while auth
 *    is still loading), but render NOTHING when authenticated — the adjacent
 *    <LandingAuthCta> "Ir al panel" already covers that spot, avoiding two
 *    panel buttons side by side.
 *  - banner variant (closing CTA, no adjacent LandingAuthCta): swaps to
 *    "Ir al panel" -> the role's panel route when authenticated, so users
 *    who scroll to the end of the page always have *a* CTA.
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

import { LandingRegistroCta } from './LandingRegistroCta'

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

function render(props: React.ComponentProps<typeof LandingRegistroCta>) {
  act(() => { root.render(<LandingRegistroCta {...props} />) })
}

describe('<LandingRegistroCta>', () => {
  it('renders "Empezar ahora" -> /auth?mode=register when logged out (header variant)', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false })
    render({ variant: 'header' })
    const anchor = container.querySelector('a')!
    expect(anchor.textContent).toBe('Empezar ahora')
    expect(anchor.getAttribute('href')).toBe('/auth?mode=register')
    expect(anchor.className).toBe('btn primary sm')
  })

  it('renders "Empezar ahora" while auth is still loading, even with a user in context', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'agency' }, isAuthenticated: true, isLoading: true })
    render({ variant: 'header' })
    const anchor = container.querySelector('a')!
    expect(anchor.textContent).toBe('Empezar ahora')
    expect(anchor.getAttribute('href')).toBe('/auth?mode=register')
  })

  it('renders nothing for the header variant when authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'agency' }, isAuthenticated: true, isLoading: false })
    render({ variant: 'header' })
    expect(container.querySelector('a')).toBeNull()
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing for the mobile variant when authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'landlord' }, isAuthenticated: true, isLoading: false })
    render({ variant: 'mobile' })
    expect(container.querySelector('a')).toBeNull()
  })

  it('applies the mobile variant classes (btn primary lg) when logged out', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false })
    render({ variant: 'mobile' })
    const anchor = container.querySelector('a')!
    expect(anchor.className).toBe('btn primary lg')
  })

  it('swaps the banner variant to "Ir al panel" -> the role route when authenticated (agency)', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'agency' }, isAuthenticated: true, isLoading: false })
    render({ variant: 'banner' })
    const anchor = container.querySelector('a')!
    expect(anchor.textContent).toBe('Ir al panel')
    expect(anchor.getAttribute('href')).toBe('/panel/inmobiliaria/piloto')
    expect(anchor.className).toBe('btn primary sm')
  })

  it('swaps the banner variant to the landlord panel route when authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'landlord' }, isAuthenticated: true, isLoading: false })
    render({ variant: 'banner' })
    const anchor = container.querySelector('a')!
    expect(anchor.getAttribute('href')).toBe('/panel')
  })

  it('renders "Empezar ahora" for the banner variant when logged out', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false })
    render({ variant: 'banner' })
    const anchor = container.querySelector('a')!
    expect(anchor.textContent).toBe('Empezar ahora')
    expect(anchor.getAttribute('href')).toBe('/auth?mode=register')
  })
})
