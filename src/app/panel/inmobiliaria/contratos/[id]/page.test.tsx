/**
 * page.test.tsx — the contract detail header (T-0040).
 *
 * The consecutive number replaces the raw UUID in the most visible slot of the
 * detail screen. VERIFY reverted that branch along with the rest of the front
 * deliverable and the suite stayed green end to end, so this file exists to
 * make the header's two states observable:
 *
 *   * `Contrato #{code}` when the number is there;
 *   * `ID: {uuid}` when it is not — which only happens against a `back` older
 *     than T-0040. The UUID is not deleted from the product, it is demoted.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Contract } from '@/lib/types/contract'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { useContractMock, permisos } = vi.hoisted(() => ({
  useContractMock: vi.fn(),
  permisos: { puede: false },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'contract-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))

vi.mock('@/lib/hooks/useContracts', () => ({
  useContract: () => useContractMock(),
  useContractPreview: () => ({ preview: null, isLoading: false }),
  useContractRejections: () => ({ rejections: [] }),
  useContractActions: () => ({ isSubmitting: false, lastError: null }),
  useSignedPdfUrl: () => ({ url: null, isLoading: false }),
  isPermissionError: () => false,
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => permisos.puede }),
}))

vi.mock('@/lib/auth/useAgencyAccess', () => ({
  useAgencyAccess: () => ({ isManager: false }),
}))

vi.mock('@/lib/inmobiliaria/respaldo', () => ({
  leerRespaldo: () => null,
  etiquetaDeTipo: (t: string) => t,
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// ── Presentational leaves ─────────────────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  // Forwards every prop EXCEPT the component-level ones React would warn about
  // on a DOM node. Keeping the rest matters: a mock that filters props can pass
  // a button that is unreachable by keyboard.
  Button: ({ children, variant, size, hideArrow, asChild, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void variant; void size; void hideArrow; void asChild
    return React.createElement('button', props, children)
  },
}))

vi.mock('@/components/ui', () => ({
  Spinner: () => React.createElement('div', { 'data-testid': 'spinner' }),
  Badge: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'badge' }, children),
}))

// Each factory builds its own element: `vi.mock` is hoisted above every
// top-level binding, so a shared helper defined here is not initialised yet
// when the factory runs.
vi.mock('@/components/contract/AuditTrail', () => ({
  AuditTrail: () => React.createElement('div', { 'data-testid': 'audit-trail' }),
}))
vi.mock('@/components/contract/RejectionsHistory', () => ({
  RejectionsHistory: () =>
    React.createElement('div', { 'data-testid': 'rejections-history' }),
}))
vi.mock('@/components/contract/CancelContractModal', () => ({
  CancelContractModal: () =>
    React.createElement('div', { 'data-testid': 'cancel-modal' }),
}))
vi.mock('@/components/contract/DownloadContractPdfButton', () => ({
  DownloadContractPdfButton: () =>
    React.createElement('div', { 'data-testid': 'download-pdf' }),
}))
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: () => React.createElement('div', { 'data-testid': 'fallo-carga' }),
}))
vi.mock('@/components/contratos/AdministracionDelContrato', () => ({
  AdministracionDelContrato: () =>
    React.createElement('div', { 'data-testid': 'administracion' }),
}))
vi.mock('@/components/contratos/ConceptosDelContrato', () => ({
  ConceptosDelContrato: () =>
    React.createElement('div', { 'data-testid': 'conceptos' }),
}))
vi.mock('@/components/contratos/InvitarInquilino', () => ({
  InvitarInquilino: () =>
    React.createElement('div', { 'data-testid': 'invitar-inquilino' }),
}))
vi.mock('@/components/contratos/ReglasDeMoraDelContrato', () => ({
  ReglasDeMoraDelContrato: () =>
    React.createElement('div', { 'data-testid': 'reglas-de-mora' }),
}))
vi.mock('@/components/contratos/CobrosDelContrato', () => ({
  CobrosDelContrato: () =>
    React.createElement('div', { 'data-testid': 'cobros' }),
}))
vi.mock('@/components/contratos/VincularInmueble', () => ({
  VincularInmueble: ({ puedeVincular }: { puedeVincular: boolean }) =>
    puedeVincular
      ? React.createElement('button', { 'data-testid': 'vincular-inmueble' }, 'Vincular inmueble')
      : null,
}))

// ── Import page AFTER mocks ───────────────────────────────────────────────
import ContratoDetallePage from './page'

const CONTRACT_ID = '7f3c1d2e-5a6b-4c7d-8e9f-0a1b2c3d4e5f'

function contract(overrides: Partial<Contract>): Contract {
  return {
    id: CONTRACT_ID,
    propertyId: 'prop-1',
    tenantId: 'tenant-1',
    status: 'active',
    landlordName: 'Luis Pérez',
    tenantName: 'Ana Díaz',
    propertyAddress: 'Cra 76 # 32-11',
    propertyCity: 'Medellín',
    monthlyRent: 2_000_000,
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    customClauses: [],
    ...overrides,
  } as Contract
}

function withContract(c: Contract) {
  useContractMock.mockReturnValue({
    contract: c,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    setContract: vi.fn(),
  })
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useContractMock.mockReset()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.clearAllMocks()
})

async function renderPage() {
  await act(async () => {
    root.render(React.createElement(ContratoDetallePage))
  })
}

describe('ContratoDetallePage — the header identifier', () => {
  /*
   * Proven red by reverting the `Contrato #{code}` branch: the header falls
   * back to `ID: {uuid}` and the number disappears from the screen entirely.
   */
  it('shows `Contrato #{code}` and not the raw UUID', async () => {
    withContract(contract({ code: 14 }))

    await renderPage()

    expect(container.textContent).toContain('Contrato #14')
    expect(container.textContent).not.toContain(CONTRACT_ID)
  })

  it('falls back to the UUID when there is no number', async () => {
    // Only a `back` older than T-0040 produces this. The UUID line is the
    // frozen degradation — never `#0`, never `#undefined`.
    withContract(contract({ code: undefined }))

    await renderPage()

    expect(container.textContent).toContain(`ID: ${CONTRACT_ID}`)
    expect(container.textContent).not.toContain('#undefined')
    expect(container.textContent).not.toContain('Contrato #')
  })
})

describe('ContratoDetallePage — la cuenta del contrato', () => {
  /*
   * Nico (2026-09-02): «sigo sin ver que yo le pueda sumar conceptos a un
   * contrato y adicional que pueda ver los cobros que ha tenido ese
   * contrato». Los conceptos estaban abajo del pliegue en la columna
   * angosta; los cobros no estaban. Ahora los dos van en la columna ancha,
   * antes que el documento cuando el contrato ya está activo.
   */
  it('en un contrato activo, conceptos y cobros van ANTES del documento', async () => {
    withContract(contract({ status: 'active' }))

    await renderPage()

    const conceptos = container.querySelector('[data-testid="conceptos"]')
    const cobros = container.querySelector('[data-testid="cobros"]')
    const documento = Array.from(container.querySelectorAll('h3')).find(
      (h) => h.textContent === 'Documento',
    )
    expect(conceptos).not.toBeNull()
    expect(cobros).not.toBeNull()
    expect(documento).toBeDefined()
    // `compareDocumentPosition`: 4 = el otro nodo viene DESPUÉS.
    expect(conceptos!.compareDocumentPosition(documento!) & 4).toBe(4)
    expect(cobros!.compareDocumentPosition(documento!) & 4).toBe(4)
  })

  it('mientras se firma, el documento manda: va antes que la cuenta', async () => {
    withContract(contract({ status: 'pending_tenant' }))

    await renderPage()

    const cobros = container.querySelector('[data-testid="cobros"]')!
    const documento = Array.from(container.querySelectorAll('h3')).find(
      (h) => h.textContent === 'Documento',
    )!
    expect(documento.compareDocumentPosition(cobros) & 4).toBe(4)
  })

  it('sin inmueble, la tarjeta Propiedad ofrece vincularlo y dice que no genera cobros', async () => {
    withContract(contract({ propertyId: null }))
    permisos.puede = true

    await renderPage()
    permisos.puede = false

    expect(container.textContent).toContain('Sin inmueble vinculado: este contrato no genera cobros.')
    expect(container.querySelector('[data-testid="vincular-inmueble"]')).not.toBeNull()
  })

  it('con inmueble, no hay nada que vincular', async () => {
    withContract(contract({ propertyId: 'prop-1' }))

    await renderPage()

    expect(container.querySelector('[data-testid="vincular-inmueble"]')).toBeNull()
    expect(container.textContent).not.toContain('Sin inmueble vinculado')
    expect(container.querySelector('[data-testid="ver-inmueble"]')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/inmuebles/prop-1',
    )
  })
})

describe('ContratoDetallePage — el propietario', () => {
  it('es el de la consignación (ficha con documento), nunca landlordName', async () => {
    withContract(
      contract({
        contractOrigin: 'MIGRATED',
        landlordName: 'victor ortiz',
        propietarioDeLaConsignacion: { id: 'po-9', name: 'Jorge Restrepo', documentNumber: '71234567' },
      }),
    )

    await renderPage()

    const ficha = container.querySelector('[data-testid="propietario-ficha"]')
    expect(ficha?.textContent).toBe('Jorge Restrepo')
    expect(ficha?.getAttribute('href')).toBe('/panel/inmobiliaria/propietarios/po-9')
    expect(container.textContent).toContain('71234567')
    expect(container.textContent).not.toContain('victor ortiz')
  })

  it('un contrato migrado sin consignación lo dice en vez de mostrar al usuario que migró', async () => {
    withContract(
      contract({ contractOrigin: 'MIGRATED', landlordName: 'victor ortiz', propertyId: null, propietarioDeLaConsignacion: null }),
    )

    await renderPage()

    expect(container.querySelector('[data-testid="propietario-sin-consignacion"]')?.textContent).toBe(
      'Se vincula con el inmueble.',
    )
    expect(container.textContent).not.toContain('victor ortiz')
  })

  it('un contrato nativo sin consignación sigue mostrando landlordName', async () => {
    withContract(contract({ contractOrigin: 'GENERATED', landlordName: 'Luis Pérez', propietarioDeLaConsignacion: null }))

    await renderPage()

    expect(container.textContent).toContain('Luis Pérez')
  })
})

describe('ContratoDetallePage — el resumen de arriba', () => {
  it('el número es el título y los cuatro números van en la franja', async () => {
    withContract(
      contract({
        code: 99,
        monthlyRent: 2_100_000,
        endDate: '2099-12-31T00:00:00.000Z',
        paymentDueDay: 5,
        diasDePlazo: 3,
      }),
    )

    await renderPage()

    const h1 = container.querySelector('h1')!
    expect(h1.textContent).toBe('Contrato #99')
    const franja = container.querySelector('[data-testid="resumen-del-contrato"]')!
    expect(franja.textContent).toContain('2.100.000')
    expect(franja.textContent).toContain('31 dic 2099')
    expect(franja.textContent).toContain('Día 5')
    expect(franja.textContent).toContain('+3 de plazo')
    // Activo no lleva banda verde: el chip ya lo dice.
    expect(container.textContent).not.toContain('Los pagos se registran automáticamente')
  })

  it('un contrato vencido lo dice en la franja, no sólo en el chip', async () => {
    withContract(contract({ endDate: '2020-01-31T00:00:00.000Z' }))

    await renderPage()

    expect(container.querySelector('[data-testid="resumen-del-contrato"]')!.textContent).toContain('vencido hace')
  })
})
