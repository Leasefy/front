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

  // Un botón muerto sin motivo se lee como «está roto» — le pasó al dueño del
  // producto. Estas tres fijan que SIEMPRE haya una razón visible y audible.
  it('con campos vacíos, el botón dice POR QUÉ está deshabilitado', () => {
    CAN_APPROVE = true
    const h = mount()
    const btn = getByTestId(h.container, 'approval-aprobar-carta') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('title')).toContain('requiredHint')
    expect(btn.getAttribute('aria-describedby')).toBe('carta-required-hint')
    expect(getByTestId(h.container, 'carta-required-hint')).not.toBeNull()
    unmount(h)
  })

  it('los dos campos se anuncian como obligatorios', () => {
    CAN_APPROVE = true
    const h = mount()
    expect(
      getByTestId(h.container, 'carta-send-method')!.getAttribute('aria-required'),
    ).toBe('true')
    expect(
      getByTestId(h.container, 'carta-sent-to-address')!.getAttribute('aria-required'),
    ).toBe('true')
    unmount(h)
  })

  // La pista tiene que seguir al estado real, no ser un cartel fijo: con la
  // dirección puesta pero sin método, sigue faltando algo y sigue explicándolo.
  //
  // ⚠️ No se maneja el `Select` acá a propósito: `carta-send-method` es el
  // SelectTrigger de Radix (un <button>), NO un <select>, así que
  // `setNativeValue` no cambia el estado de React. El camino completo —los dos
  // campos puestos habilitan el botón— se verificó en navegador real.
  it('con la dirección puesta pero sin método, la pista sigue', () => {
    CAN_APPROVE = true
    const h = mount()
    const input = getByTestId(h.container, 'carta-sent-to-address') as HTMLInputElement
    act(() => {
      setNativeValue(input, 'Calle 93 # 15-27, Bogotá')
    })
    expect(input.value).toBe('Calle 93 # 15-27, Bogotá')
    const btn = getByTestId(h.container, 'approval-aprobar-carta') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(getByTestId(h.container, 'carta-required-hint')).not.toBeNull()
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

// ── Errores al aprobar o rechazar: la regla de oro (02-10-2026) ──────────────
// Antes se pintaba `approveError` tal cual: el cuerpo crudo de la respuesta o
// «approve 500». Ahora el hook deja el fallo y la pantalla lo traduce.

describe('CartaApprovalClient — errores de aprobar y rechazar', () => {
  it('un 409 del micro muestra su `message`, no «approve 409»', async () => {
    const { ApiError } = await import('@/lib/api/client')
    hookState = {
      ...hookState,
      approveError: 'approve 409',
      approveFallo: new ApiError(409, 'Esta carta ya fue aprobada por otra persona.', 'YA_APROBADA', {
        code: 'YA_APROBADA',
        message: 'Esta carta ya fue aprobada por otra persona.',
      }),
    }
    const h = mount()
    const alerta = getByTestId(h.container, 'approval-aprobar-error')
    expect(alerta?.textContent).toBe('Esta carta ya fue aprobada por otra persona.')
    expect(alerta?.getAttribute('role')).toBe('alert')
    expect(h.container.textContent).not.toContain('approve 409')
    unmount(h)
  })

  it('un 5xx al rechazar dice «de nuestro lado» con la referencia', async () => {
    const { ApiError } = await import('@/lib/api/client')
    hookState = {
      ...hookState,
      rejectError: 'reject 500',
      rejectFallo: new ApiError(500, '', undefined, { error: 'Internal Server Error', requestId: 'c0ffee00-0000' }),
    }
    const h = mount()
    const texto = getByTestId(h.container, 'approval-rechazar-error')?.textContent ?? ''
    expect(texto).toContain('No pudimos rechazar la carta: algo falló de nuestro lado')
    expect(texto).toContain('c0ffee00')
    unmount(h)
  })

  it('un `fetch` que no salió (status 0) habla de la conexión', () => {
    hookState = {
      ...hookState,
      approveError: 'Failed to fetch',
      approveFallo: new TypeError('Failed to fetch'),
    }
    const h = mount()
    expect(getByTestId(h.container, 'approval-aprobar-error')?.textContent).toMatch(/conexi[oó]n/i)
    unmount(h)
  })

  it('un código del hook (la acción ni salió) se dice en español', () => {
    hookState = { ...hookState, approveError: 'SEND_METHOD_OR_ADDRESS_MISSING', approveFallo: null }
    const h = mount()
    expect(getByTestId(h.container, 'approval-aprobar-error')?.textContent).toBe(
      'Elige cómo se envía la carta y escribe la dirección.',
    )
    unmount(h)
  })
})
