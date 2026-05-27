/**
 * CartaApprovalClient — Phase 32 plan 32-09 (COBR-UI-08) unit tests.
 *
 * Uses createRoot + act + happy-dom (no RTL — matches the repo's existing
 * test convention).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: { id: 'agency-1' },
    user: null,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

let CAN_APPROVE = false
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    permissions: null,
    isLoading: false,
    error: null,
    canAccess: (_module: string, _action: string) => CAN_APPROVE,
    isAdmin: CAN_APPROVE,
    agencyRole: null,
    refetch: vi.fn(),
  }),
  usePermissionsContextSafe: () => null,
}))

const approveSpy = vi.fn()
const rejectSpy = vi.fn()
let hookState: Record<string, unknown> = {}
vi.mock('@/lib/hooks/cobranza/use-carta-approval', () => ({
  useCartaApproval: () => hookState,
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string, _params?: Record<string, unknown>) => key,
    locale: 'es',
    setLocale: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import CartaApprovalClient from './CartaApprovalClient'

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface Harness {
  root: Root
  container: HTMLDivElement
}

function mount(): Harness {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<CartaApprovalClient artifactId="art-1" />)
  })
  return { root, container }
}

function unmount(h: Harness): void {
  act(() => h.root.unmount())
  h.container.remove()
}

function getByTestId(container: HTMLElement, id: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
}

function setNativeValue(el: HTMLInputElement | HTMLSelectElement, value: string): void {
  const desc =
    el instanceof HTMLSelectElement
      ? Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')
      : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  desc?.set?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://localhost:3001'
  approveSpy.mockReset()
  rejectSpy.mockReset()
  hookState = {
    isApproving: false,
    isRejecting: false,
    approveResult: null,
    rejectResult: null,
    approveError: null,
    rejectError: null,
    pdfDownloadUrl: null,
    pdfApprovedAt: null,
    approve: approveSpy,
    reject: rejectSpy,
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CartaApprovalClient', () => {
  it('Test 1: Aprobar button is disabled when canApprove is false', () => {
    CAN_APPROVE = false
    const h = mount()
    const btn = getByTestId(h.container, 'approval-aprobar-carta') as HTMLButtonElement | null
    expect(btn).not.toBeNull()
    expect(btn!.disabled).toBe(true)
    expect(btn!.getAttribute('title')).toContain('permissionTooltip')
    unmount(h)
  })

  it('Test 2: Aprobar button is disabled when sendMethod is not selected', () => {
    CAN_APPROVE = true
    const h = mount()
    // sendMethod default = ''
    const btn = getByTestId(h.container, 'approval-aprobar-carta') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    unmount(h)
  })

  it('Test 3: Aprobar button is disabled when sentToAddress is empty', () => {
    CAN_APPROVE = true
    const h = mount()
    // Select a sendMethod but leave address empty.
    const select = getByTestId(h.container, 'carta-send-method') as HTMLSelectElement
    act(() => {
      setNativeValue(select, 'operator_manual')
    })
    const btn = getByTestId(h.container, 'approval-aprobar-carta') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    unmount(h)
  })

  it('Test 4: Download card is not shown before approve', () => {
    CAN_APPROVE = true
    const h = mount()
    expect(getByTestId(h.container, 'carta-download-card')).toBeNull()
    expect(getByTestId(h.container, 'carta-download-link')).toBeNull()
    unmount(h)
  })

  it('Test 5: Download card renders when approveResult is non-null + legal notice present', () => {
    CAN_APPROVE = true
    hookState = {
      ...hookState,
      approveResult: {
        artifactId: 'art-1',
        approved: true,
        signedUrl:
          'http://localhost:3001/api/agency/agency-1/cartera/legal-artifacts/art-1/pdf',
      },
      pdfDownloadUrl:
        'http://localhost:3001/api/agency/agency-1/cartera/legal-artifacts/art-1/pdf',
      pdfApprovedAt: new Date(),
    }
    const h = mount()
    const card = getByTestId(h.container, 'carta-download-card')
    expect(card).not.toBeNull()
    const link = getByTestId(h.container, 'carta-download-link') as HTMLAnchorElement
    expect(link.href).toContain('/legal-artifacts/art-1/pdf')
    const notice = getByTestId(h.container, 'carta-legal-notice')
    expect(notice).not.toBeNull()
    // i18n stub returns the key — verifies the legal-notice key is wired.
    expect(notice!.textContent).toContain('legalNotice')
    unmount(h)
  })

  it('Test 6: RechazarForm confirm is disabled with no reason selected', () => {
    CAN_APPROVE = true
    const h = mount()
    const rechazarBtn = getByTestId(h.container, 'approval-rechazar-carta') as HTMLButtonElement
    act(() => {
      rechazarBtn.click()
    })
    const confirm = getByTestId(h.container, 'rechazar-confirm') as HTMLButtonElement
    expect(confirm).not.toBeNull()
    expect(confirm.disabled).toBe(true)
    unmount(h)
  })
})
