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

const { useContractMock } = vi.hoisted(() => ({ useContractMock: vi.fn() }))

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
  usePermissions: () => ({ canAccess: () => false }),
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
