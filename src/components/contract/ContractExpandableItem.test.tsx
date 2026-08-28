import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { getPreview: vi.fn(), sendForSigning: vi.fn() },
}))

import { ContractExpandableItem } from './ContractExpandableItem'
import type { Contract } from '@/lib/types/contract'

/**
 * T-0033 contract.md §3.2.E3 R3 — un contrato MIGRADO sin inmueble debe
 * mostrar "Sin inmueble" en vez de una dirección vacía, y la línea
 * `tenantName · propertyCity` no debe dejar un separador huérfano.
 */
function contratoBase(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c-1',
    propertyId: 'prop-1',
    tenantId: 'tenant-1',
    landlordId: 'land-1',
    status: 'active',
    propertyAddress: 'Cra 13 #55-20',
    propertyCity: 'Medellín',
    tenantName: 'Ana Pérez',
    tenantEmail: 'ana@correo.co',
    tenantPhone: '3001234567',
    tenantDocument: '123456',
    landlordName: 'Propietario X',
    landlordEmail: 'land@x.co',
    landlordDocument: '987654',
    monthlyRent: 2_000_000,
    adminFee: 0,
    startDate: '2025-01-01',
    endDate: '2030-01-01',
    paymentDueDay: 5,
    landlordSignature: null,
    tenantSignature: null,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  } as Contract
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

describe('<ContractExpandableItem> — contrato sin inmueble (T-0033)', () => {
  it('muestra la dirección cuando el contrato tiene inmueble', () => {
    render(contratoBase())
    expect(container.textContent).toContain('Cra 13 #55-20')
    expect(container.textContent).not.toContain('Sin inmueble')
  })

  it('muestra "Sin inmueble" cuando propertyId es null', () => {
    render(contratoBase({ propertyId: null, propertyAddress: '', propertyCity: '' }))
    expect(container.textContent).toContain('Sin inmueble')
  })

  it('no deja un separador "·" huérfano cuando falta la ciudad', () => {
    render(
      contratoBase({
        propertyId: null,
        propertyAddress: '',
        propertyCity: '',
        tenantName: 'Ana Pérez',
      }),
    )
    // Sin ciudad, la línea debe ser sólo el nombre del inquilino — nunca
    // "Ana Pérez · " con un separador colgando.
    const linea = Array.from(container.querySelectorAll('p')).find((p) =>
      p.textContent?.includes('Ana Pérez'),
    )
    expect(linea?.textContent?.trim()).toBe('Ana Pérez')
  })
})
