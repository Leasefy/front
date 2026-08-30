/**
 * page.test.tsx — the contracts list: the consecutive-number column (T-0040)
 * and the loading skeleton's cell count.
 *
 * VERIFY reverted this column — header AND cell — and `front` stayed at
 * 400/400 files, 3610/3610 tests, exit 0. Nothing on this screen was covered.
 *
 * The skeleton assertion is here for the same reason the column regressed:
 * `TableSkeleton` restated its cell count as a literal `5` while `COLUMNS`
 * grew to 7, so the loading rows rendered two cells short of the header. A
 * count derived from `COLUMNS` cannot drift again; this test is what keeps it
 * derived.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Contract } from '@/lib/types/contract'

void React // jsx-preserve

// react-dom/client needs this flag to recognize our act() wrapping.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { useContractsMock, pushMock } = vi.hoisted(() => ({
  useContractsMock: vi.fn(),
  pushMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/contratos',
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))

vi.mock('@/lib/hooks/use-auto-refresh', () => ({
  useAutoRefresh: () => undefined,
}))

vi.mock('@/lib/hooks/useContracts', () => ({
  useContracts: () => useContractsMock(),
}))

vi.mock('@/components/inmobiliaria/SelectorPostulacion', () => ({
  NuevoContratoBoton: () =>
    React.createElement('button', { 'data-testid': 'nuevo-contrato' }, 'Nuevo'),
}))

vi.mock('@/components/estado/SinDatos', () => ({
  SinDatos: ({ titulo }: { titulo: string }) =>
    React.createElement('div', { 'data-testid': 'sin-datos' }, titulo),
}))

vi.mock('@/components/ui/button', () => ({
  // Forwards every prop EXCEPT the component-level ones React would warn about
  // on a DOM node. Keeping the rest matters: a mock that filters props can pass
  // a button that is unreachable by keyboard.
  Button: ({ children, variant, size, hideArrow, asChild, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void variant; void size; void hideArrow; void asChild
    return React.createElement('button', props, children)
  },
}))

vi.mock('@/components/ui/pagination', () => ({
  TablePagination: () => React.createElement('div', { 'data-testid': 'pagination' }),
}))

vi.mock('@leasefy/cadence', () => ({
  Eyebrow: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('p', null, children),
}))

// The table shim re-exports cadence primitives — replace it with plain
// elements, forwarding ALL props so nothing that reaches the DOM is hidden.
vi.mock('@/components/ui/table', () => {
  const el = (tag: string) => {
    const MockEl = ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(tag, props, children)
    MockEl.displayName = `MockTable_${tag}`
    return MockEl
  }
  return {
    Table: el('table'),
    TableHeader: el('thead'),
    TableBody: el('tbody'),
    TableRow: el('tr'),
    TableHead: el('th'),
    TableCell: el('td'),
  }
})

// ── Import page AFTER mocks ───────────────────────────────────────────────
import ContratosPage from './page'

const EMPTY_STATS = {
  total: 0,
  active: 0,
  draft: 0,
  pendingLandlord: 0,
  pendingTenant: 0,
}

function contract(overrides: Partial<Contract>): Contract {
  return {
    id: 'c-1',
    propertyId: 'prop-1',
    tenantId: 'tenant-1',
    status: 'active',
    tenantName: 'Ana Díaz',
    tenantEmail: 'ana@example.com',
    propertyAddress: 'Cra 76 # 32-11',
    propertyCity: 'Medellín',
    monthlyRent: 2_000_000,
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    ...overrides,
  } as Contract
}

function withContracts(contracts: Contract[], overrides: Record<string, unknown> = {}) {
  useContractsMock.mockReturnValue({
    contracts,
    stats: { ...EMPTY_STATS, total: contracts.length },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  })
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useContractsMock.mockReset()
  pushMock.mockReset()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.clearAllMocks()
})

async function renderPage() {
  await act(async () => {
    root.render(React.createElement(ContratosPage))
  })
}

const headerCells = () => Array.from(container.querySelectorAll('thead th'))
const bodyRows = () => Array.from(container.querySelectorAll('tbody tr'))

describe('ContratosPage — the consecutive-number column', () => {
  /*
   * The column is leftmost and narrow, mirroring the property code in
   * `ConsignacionTable`. Proven red by deleting the header entry and the cell.
   */
  it('renders the number as the first cell of the row', async () => {
    withContracts([contract({ id: 'c-1', code: 14 })])

    await renderPage()

    expect(headerCells()[0].textContent).toBe('Código')
    expect(bodyRows()[0].querySelectorAll('td')[0].textContent).toBe('#14')
  })

  it('leaves the cell EMPTY when there is no number — never “—”, never “#0”', async () => {
    // The only cause of an absent code is a `back` older than T-0040, and the
    // frozen degradation for that case is to render nothing. `—` here would
    // read as "this contract has no number", which is not a thing.
    withContracts([contract({ id: 'c-1', code: undefined })])

    await renderPage()

    const first = bodyRows()[0].querySelectorAll('td')[0]
    expect(first.textContent).toBe('')
    expect(first.textContent).not.toContain('—')
    expect(first.textContent).not.toContain('#')
  })

  it('renders a number for every contract in the page', async () => {
    withContracts([
      contract({ id: 'c-1', code: 1 }),
      contract({ id: 'c-2', code: 2 }),
      contract({ id: 'c-3', code: 3 }),
    ])

    await renderPage()

    expect(
      bodyRows().map((r) => r.querySelectorAll('td')[0].textContent),
    ).toEqual(['#1', '#2', '#3'])
  })
})

describe('ContratosPage — the loading skeleton', () => {
  /*
   * F-4. `TableSkeleton` hardcoded 5 cells while `COLUMNS` holds 7, so loading
   * rows rendered two cells short of the header — a real T-0040 regression,
   * introduced precisely because the count was restated instead of derived.
   *
   * Proven red by putting the literal back.
   */
  it('renders one skeleton cell per column, derived from COLUMNS', async () => {
    withContracts([], { isLoading: true })

    await renderPage()

    const rows = bodyRows()
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.querySelectorAll('td')).toHaveLength(headerCells().length)
    }
  })
})
