/**
 * SiniestroApprovalClient — Phase 32 plan 32-09 (COBR-UI-07) unit tests.
 *
 * Uses createRoot + act + happy-dom (no RTL — matches the repo's existing
 * test convention in lib/hooks/cobranza/__tests__/).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mocks (declared before importing the component under test).
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

// canApprove is toggled per-test by reassigning this module-level var.
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

// Hook stub — overridable per test via mockReturnValue.
const approveSpy = vi.fn()
const rejectSpy = vi.fn()
let hookState: Record<string, unknown> = {}
vi.mock('@/lib/hooks/cobranza/use-siniestro-approval', () => ({
  useSiniestroApproval: () => hookState,
}))

// Minimal i18n stub — passthrough keys for deterministic assertions.
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string, _params?: Record<string, unknown>) => key,
    locale: 'es',
    setLocale: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// Imports under test (after mocks).
// ---------------------------------------------------------------------------

import SiniestroApprovalClient from './SiniestroApprovalClient'

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
    root.render(<SiniestroApprovalClient claimId="claim-1" />)
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
    approvedInsurers: [],
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

describe('SiniestroApprovalClient', () => {
  it('Test 1: Aprobar button is disabled when canApprove is false', () => {
    CAN_APPROVE = false
    const h = mount()
    const btn = getByTestId(h.container, 'approval-aprobar-siniestro') as HTMLButtonElement | null
    expect(btn).not.toBeNull()
    expect(btn!.disabled).toBe(true)
    expect(btn!.getAttribute('title')).toContain('permissionTooltip')
    unmount(h)
  })

  it('Test 2: Aprobar button is disabled when no insurer is selected (canApprove=true)', () => {
    CAN_APPROVE = true
    const h = mount()
    // Uncheck all 4 insurers.
    for (const ins of ['sura', 'mapfre', 'solidaria', 'accion']) {
      const cb = getByTestId(h.container, `siniestro-insurer-${ins}`) as HTMLInputElement | null
      expect(cb).not.toBeNull()
      act(() => {
        cb!.click()
      })
    }
    const btn = getByTestId(h.container, 'approval-aprobar-siniestro') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    unmount(h)
  })

  it('Test 3: Aprobar button is enabled when ≥1 insurer is checked and canApprove=true', () => {
    CAN_APPROVE = true
    const h = mount()
    const btn = getByTestId(h.container, 'approval-aprobar-siniestro') as HTMLButtonElement
    // Default: all 4 checked → enabled.
    expect(btn.disabled).toBe(false)
    unmount(h)
  })

  it('Test 4: RechazarForm is not visible initially', () => {
    CAN_APPROVE = true
    const h = mount()
    expect(getByTestId(h.container, 'rechazar-form')).toBeNull()
    expect(getByTestId(h.container, 'rechazar-confirm')).toBeNull()
    unmount(h)
  })

  it('Test 5: RechazarForm appears after clicking Rechazar', () => {
    CAN_APPROVE = true
    const h = mount()
    const rechazarBtn = getByTestId(h.container, 'approval-rechazar-siniestro') as HTMLButtonElement
    act(() => {
      rechazarBtn.click()
    })
    expect(getByTestId(h.container, 'rechazar-form')).not.toBeNull()
    expect(getByTestId(h.container, 'rechazar-confirm')).not.toBeNull()
    unmount(h)
  })

  it('Test 6: RechazarForm confirm is disabled with no reason selected', () => {
    CAN_APPROVE = true
    const h = mount()
    const rechazarBtn = getByTestId(h.container, 'approval-rechazar-siniestro') as HTMLButtonElement
    act(() => {
      rechazarBtn.click()
    })
    const confirm = getByTestId(h.container, 'rechazar-confirm') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    unmount(h)
  })
})
