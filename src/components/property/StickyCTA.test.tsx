import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ── Mocks (hoisted) ──────────────────────────────────────────────────────────
let authState: {
  user: { role?: string; backendRole?: string } | null
  isAuthenticated: boolean
  hasActiveAgencyMembership: boolean
}

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => authState }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/propiedades/p1',
}))
vi.mock('@/lib/api/visits.service', () => ({
  visitsApi: { getSlots: vi.fn().mockResolvedValue({ slots: [] }), create: vi.fn() },
}))

import { StickyCTA } from './StickyCTA'

let container: HTMLDivElement
let root: Root
const writeText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  authState = { user: null, isAuthenticated: false, hasActiveAgencyMembership: false }
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  writeText.mockClear()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render() {
  act(() => {
    root.render(<StickyCTA propertyId="p1" price={1500000} />)
  })
}

function q(sel: string) {
  return container.querySelector(sel)
}

describe('<StickyCTA> — tenant / anonymous viewer', () => {
  /*
   * El CTA de postularse **sigue estando** — nunca se esconde ni se
   * deshabilita. Lo que cambió es a dónde lleva: sin aprobación ya no salta
   * directo al wizard, abre el camino que falta recorrer (ver PostularButton
   * y docs/VOCABULARIO.md). Un muro convertido en escalón.
   */
  it('muestra el CTA de postularse, visible y con su texto', () => {
    render()

    expect(container.textContent).toContain('Postularme a esta propiedad')
    const cta = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Postularme a esta propiedad'),
    )
    expect(cta).toBeTruthy()
    expect(cta?.hasAttribute('disabled')).toBe(false)
    // No agency share panel for a tenant/anonymous viewer.
    expect(q('[data-testid="agency-share-panel"]')).toBeFalsy()
  })

  it('sin aprobación NO salta directo al wizard: primero explica qué falta', () => {
    render()
    // Sin sesión no hay aprobación posible → el gate intercepta el clic.
    expect(q('a[href="/aplicar/p1"]')).toBeFalsy()
  })
})

describe('<StickyCTA> — inmobiliaria / agent viewer', () => {
  it('replaces apply/visit with a share panel (no /aplicar link) for an agency user', () => {
    authState = { user: { role: 'agency' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    render()

    expect(q('[data-testid="agency-share-panel"]')).toBeTruthy()
    // The tenant actions must be gone.
    expect(q('a[href="/aplicar/p1"]')).toBeFalsy()
    expect(container.textContent).not.toContain('Postularme a esta propiedad')
  })

  it('treats an invited agent (backendRole AGENT) as an agency viewer', () => {
    authState = { user: { backendRole: 'AGENT' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    render()

    expect(q('[data-testid="agency-share-panel"]')).toBeTruthy()
  })

  it('treats a personal-role user with an active agency membership as an agency viewer', () => {
    authState = { user: { role: 'landlord' }, isAuthenticated: true, hasActiveAgencyMembership: true }
    render()

    expect(q('[data-testid="agency-share-panel"]')).toBeTruthy()
  })

  it('copies the public property link to the clipboard when the copy button is clicked', async () => {
    authState = { user: { role: 'agency' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    render()

    const copyBtn = q('[data-testid="agency-share-copy"]') as HTMLButtonElement
    expect(copyBtn).toBeTruthy()

    await act(async () => {
      copyBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('/propiedades/p1')
  })
})
