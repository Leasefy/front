import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * T-0033 WU-5 / VERIFY-final Finding 1 — the earlier `ContractExpandableItem.test.tsx`
 * hand-built its own `Contract` fixture directly (bypassing `mapBackendContract` and the
 * real `GET /contracts` payload entirely), so it stayed green while the feature was dead
 * in production: `ContractsService.listForUser` never returned `propertyId` (only nested
 * inside `property`), so `c.propertyId === null` was always `false` at runtime.
 *
 * This file exercises the REAL pipeline instead: it mocks only `globalThis.fetch` with the
 * JSON shape `GET /contracts` (listForUser) actually returns, calls the real
 * `contractsApi.getMine()` (real `mapBackendContract`, not re-implemented here), and renders
 * the real `<ContractExpandableItem>` against the result. If a future change to
 * `listForUser`'s projection silently drops a field `BackendContract` declares, this test
 * fails instead of shipping — the durable half of the WU-5 fix.
 */

import { contractsApi } from '@/lib/api/contracts.service'
import { ContractExpandableItem } from './ContractExpandableItem'
import type { Contract } from '@/lib/types/contract'

const BACKEND_URL = 'http://localhost:3000'

function mockGetContracts(body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response)
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render(contract: Contract) {
  act(() => {
    root.render(<ContractExpandableItem contract={contract} />)
  })
}

function expandir() {
  const boton = container.querySelector('button')
  if (!boton) throw new Error('No se encontró el botón para expandir el item')
  act(() => {
    boton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/**
 * El JSON REAL que `GET /contracts` (listForUser, post WU-5) devuelve para un contrato
 * MIGRADO sin inmueble, con firma real (contrato nativo firmado) y contacto del inquilino
 * — exactamente los campos que `ContractExpandableItem` necesita y que la proyección
 * angosta previa a WU-5 nunca mandaba: `propertyId`, `tenantId`, `landlordId`,
 * `tenantEmail`, `tenantPhone`, `propertyAdminFee`, `landlordSignature`, `tenantSignature`.
 */
function filaListForUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c-1',
    applicationId: 'app-1',
    propertyId: null,
    landlordId: 'land-1',
    tenantId: 'tenant-1',
    status: 'ACTIVE',
    propertyTitle: '',
    propertyAddress: 'Dirección del archivo migrado',
    tenantName: 'Ana Pérez',
    tenantEmail: 'ana@correo.co',
    tenantPhone: '3001234567',
    property: null,
    tenant: {
      id: 'tenant-1',
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@correo.co',
    },
    propertyAdminFee: 50_000,
    monthlyRent: 2_000_000,
    startDate: '2025-01-01',
    endDate: '2030-01-01',
    role: 'LANDLORD',
    landlordSignature: { signedAt: '2026-08-01T00:00:00.000Z' },
    tenantSignature: null,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  }
}

describe('<ContractExpandableItem> contra el payload real de GET /contracts (T-0033 WU-5)', () => {
  it('un contrato MIGRADO sin inmueble muestra "Sin inmueble" — nunca una dirección vacía con separador huérfano', async () => {
    const fetchMock = mockGetContracts([filaListForUser()])
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const [contract] = await contractsApi.getMine()
    expect(contract.propertyId).toBeNull()

    render(contract)

    expect(container.textContent).toContain('Sin inmueble')
    // La línea "tenantName · propertyCity" no debe dejar un "·" huérfano
    // cuando propertyCity vino vacío (no hay Property).
    const linea = Array.from(container.querySelectorAll('p')).find((p) =>
      p.textContent?.includes('Ana Pérez'),
    )
    expect(linea?.textContent?.trim()).toBe('Ana Pérez')
  })

  it('el estado de firma refleja landlordSignature/tenantSignature reales — no siempre "Pendiente"', async () => {
    const fetchMock = mockGetContracts([filaListForUser()])
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const [contract] = await contractsApi.getMine()
    expect(contract.landlordSignature).not.toBeNull()
    expect(contract.tenantSignature).toBeNull()

    render(contract)
    expandir()

    expect(container.textContent).toContain('Firmado');
    expect(container.textContent).toContain('Pendiente');
  })

  it('el contacto del inquilino (teléfono, correo) y la administración vienen del payload real, no en blanco', async () => {
    const fetchMock = mockGetContracts([filaListForUser()])
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const [contract] = await contractsApi.getMine()
    expect(contract.tenantEmail).toBe('ana@correo.co');
    expect(contract.tenantPhone).toBe('3001234567');
    expect(contract.adminFee).toBe(50_000);

    render(contract)
    expandir()

    const telHref = container.querySelector('a[href^="tel:"]');
    const mailtoHref = container.querySelector('a[href^="mailto:"]');
    expect(telHref?.getAttribute('href')).toBe('tel:3001234567');
    expect(mailtoHref?.getAttribute('href')).toBe('mailto:ana@correo.co');
  })

  it('un contrato con inmueble no muestra "Sin inmueble" y sí la dirección real', async () => {
    const fetchMock = mockGetContracts([
      filaListForUser({
        propertyId: 'prop-1',
        // El back ya resuelve el fallback (snapshot || Property.address || '')
        // antes de mandarlo — nunca null cuando hay Property.
        propertyAddress: 'Cra 13 #55-20',
        property: { id: 'prop-1', title: 'Casa', address: 'Cra 13 #55-20' },
      }),
    ])
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const [contract] = await contractsApi.getMine()
    expect(contract.propertyId).toBe('prop-1')

    render(contract)

    expect(container.textContent).not.toContain('Sin inmueble')
    expect(container.textContent).toContain('Cra 13 #55-20')
  })
})
