/**
 * CO-15 (QA-MIGRACION-95, 06-10-2026). Un contrato migrado sobre un mandato
 * cuyo archivo traía dos dueños SIN porcentaje: la ficha decía «50 % ·
 * $ 550.000 del canon» (el provisional del CHECK) como un hecho. Con la marca
 * del back, cada dueño dice «Falta el porcentaje» y la tarjeta avisa que el
 * giro no sale. (Preparación copiada de `PartesDelContrato.sin-ficha.test.tsx`.)
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/contracts.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/contracts.service')>()
  return {
    ...actual,
    contractsApi: {
      ...actual.contractsApi,
      agregarInquilino: vi.fn(),
      quitarInquilino: vi.fn(),
      getById: vi.fn(),
    },
  }
})

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const getAllConsignaciones = vi.fn()
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: {
    getAll: (...args: unknown[]) => getAllConsignaciones(...args),
  },
}))

/*
 * El diálogo de dueños se prueba en su propio archivo; acá sólo importa que
 * la tarjeta lo abra sobre el mandato del inmueble y relea el contrato al
 * guardar. Un doble que expone los dos callbacks basta.
 */
vi.mock('@/components/inmobiliaria/EditarPropietariosDialog', () => ({
  EditarPropietariosDialog: ({
    open,
    consignacion,
    onGuardado,
  }: {
    open: boolean
    consignacion: { id: string }
    onGuardado: (c: unknown) => void
  }) =>
    open ? (
      <div data-testid="dialogo-de-duenos" data-consignacion={consignacion.id}>
        <button type="button" data-testid="simular-guardado" onClick={() => onGuardado(consignacion)}>
          guardar
        </button>
      </div>
    ) : null,
}))

import { contractsApi } from '@/lib/api/contracts.service'
import { PartesDelContrato } from './PartesDelContrato'
import type { Contract, PropietarioDelContrato } from '@/lib/types/contract'

const quitarInquilino = contractsApi.quitarInquilino as unknown as ReturnType<typeof vi.fn>
const getById = contractsApi.getById as unknown as ReturnType<typeof vi.fn>

function contrato(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c-1',
    propertyId: 'p-1',
    tenantId: 'inq-1',
    landlordId: 'land-1',
    status: 'active',
    propertyAddress: 'Cra 13',
    propertyCity: 'Medellín',
    tenantName: 'Wilson Dario Sarrazola Ochoa',
    tenantEmail: 'wilson@example.com',
    tenantPhone: '3001112233',
    tenantDocument: '1026150802',
    landlordName: 'victor ortiz',
    landlordEmail: 'v@x.co',
    landlordDocument: '',
    monthlyRent: 1_000_000,
    adminFee: 0,
    startDate: '2025-01-01',
    endDate: '2030-01-01',
    paymentDueDay: 5,
    landlordSignature: null,
    tenantSignature: null,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  }
}

const dueno = (over: Partial<PropietarioDelContrato>): PropietarioDelContrato => ({
  id: 'po-1',
  name: 'Ana Gómez',
  documentNumber: '71211270',
  documentType: 'CC',
  participacionBps: 10_000,
  participacion: '100 %',
  canonCop: 1_000_000,
  esPrincipal: true,
  responsableIva: null,
  agenteRetenedorRenta: null,
  agenteRetenedorIva: null,
  agenteRetenedorIca: null,
  ...over,
})

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(c: Contract, puedeEditar = true, onActualizado: (c: Contract) => void = () => {}) {
  act(() => {
    root.render(
      <PartesDelContrato
        contract={c}
        puedeInvitar
        puedeEditar={puedeEditar}
        onActualizado={onActualizado}
        onConflicto={() => {}}
      />,
    )
  })
}


describe('CO-15 · dueños sin porcentaje en la ficha del contrato', () => {
  it('dice «Falta el porcentaje», no lleva plata y avisa que no se gira', () => {
    render(
      contrato({
        propietariosDelContrato: {
          participacionesDesconocidas: true,
          sumaBps: 10_000,
          sumanCien: true,
          propietarios: [
            dueno({ id: 'po-1', name: 'Carlos Andrés Zuluaga', participacionBps: 5000, participacion: 'Falta el porcentaje', canonCop: null }),
            dueno({ id: 'po-2', name: 'Pedro Pablo Henao', participacionBps: 5000, participacion: 'Falta el porcentaje', canonCop: null, esPrincipal: false }),
          ],
        },
      }),
    )
    expect(container.textContent).toContain('Falta el porcentaje')
    expect(container.textContent).not.toContain('50 %')
    expect(container.querySelector('[data-testid="canon-del-propietario"]')).toBeNull()
    expect(container.querySelector('[data-testid="participaciones-desconocidas"]')?.textContent).toContain('el giro de este inmueble no sale')
  })
})
