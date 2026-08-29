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

function render(props: Partial<React.ComponentProps<typeof StickyCTA>> = {}) {
  act(() => {
    root.render(<StickyCTA propertyId="p1" price={1500000} {...props} />)
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

  it('an agency viewer sees the share panel on a SALE listing too (unconditional, before the listingType branch)', () => {
    authState = { user: { role: 'agency' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    render({ listingType: 'sale', salePrice: 500_000_000 })

    expect(q('[data-testid="agency-share-panel"]')).toBeTruthy()
    expect(container.textContent).not.toContain('Contactar')
  })
})

// ============================================================================
// T-0038 — SALE listing CTA swap (contract.md §3, ledger §2.7 O-1/O-2)
// ============================================================================

describe('<StickyCTA> — SALE listing (no postulación)', () => {
  it('shows Contactar + Agendar visita instead of Postularme — no postulación on a sale listing', () => {
    render({ listingType: 'sale', salePrice: 500_000_000 })

    expect(container.textContent).not.toContain('Postularme')
    expect(container.textContent).toContain('Contactar')
    expect(container.textContent).toContain('Agendar visita')
  })

  it('"Agendar visita" renders unconditionally on a SALE listing — no per-agency agenda switch (O-2)', () => {
    render({ listingType: 'sale', salePrice: 500_000_000 })
    expect(container.textContent).toContain('Agendar visita')
  })

  it('shows the sale price, not the (absent) monthlyRent, and never "$0"/"$ 0" (C6)', () => {
    render({ listingType: 'sale', salePrice: 500_000_000, price: 0 })

    expect(container.textContent).toContain('500.000.000')
    expect(container.textContent).not.toContain('$ 0')
    expect(container.textContent).not.toContain('$0')
  })

  it('renders an explicit "no data" state when salePrice is null — never "$0" (C6)', () => {
    render({ listingType: 'sale', salePrice: null })

    expect(container.textContent).not.toContain('$ 0')
    expect(container.textContent).not.toContain('$0')
    expect(container.textContent.toLowerCase()).toContain('sin dato')
  })

  it('an unauthenticated visitor clicking "Contactar" is routed to sign-up (registration required, O-1)', async () => {
    render({ listingType: 'sale', salePrice: 500_000_000 })

    const contactTab = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Contactar'),
    )
    expect(contactTab).toBeTruthy()
    await act(async () => {
      contactTab!.click()
    })

    const contactCta = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.match(/iniciar sesión|registrarte|crear cuenta/i),
    )
    expect(contactCta).toBeTruthy()
  })

  it('does not build a @Public() contact surface — no chat UI appears without authentication', () => {
    render({ listingType: 'sale', salePrice: 500_000_000 })
    // No message input / send button before the visitor signs in.
    expect(container.querySelector('textarea')).toBeFalsy();
    expect(q('[data-testid="chat-message-input"]')).toBeFalsy();
  })
})

describe('<StickyCTA> — RENT listing (regression)', () => {
  it('defaults to RENT behaviour when listingType is not passed — Postularme still renders', () => {
    render()
    expect(container.textContent).toContain('Postularme')
    expect(container.textContent).not.toContain('Contactar')
  })
})
