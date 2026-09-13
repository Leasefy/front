/**
 * La sección «Partes» de la ficha del contrato — los tres arreglos de Nico
 * (2026-09-12):
 *
 *  1. el DOCUMENTO del inquilino, que no se estaba mostrando;
 *  2. TODOS los propietarios, con su porcentaje y su parte del canon;
 *  3. varios inquilinos, con el principal marcado.
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

/** Un contrato con dos dueños 60/40, Ana principal. */
const conDosDuenos = (over: Partial<Contract> = {}) =>
  contrato({
    propietariosDelContrato: {
      sumaBps: 10_000,
      sumanCien: true,
      propietarios: [
        dueno({ id: 'a', name: 'Ana', participacionBps: 6_000, participacion: '60 %', canonCop: 600_000 }),
        dueno({
          id: 'b',
          name: 'Beto',
          participacionBps: 4_000,
          participacion: '40 %',
          canonCop: 400_000,
          esPrincipal: false,
        }),
      ],
    },
    ...over,
  })

describe('el documento del inquilino', () => {
  it('se muestra debajo del nombre — era lo que faltaba', () => {
    render(contrato())
    expect(container.querySelector('[data-testid="documento-del-inquilino"]')?.textContent).toBe(
      '1026150802',
    )
    expect(container.textContent).toContain('Wilson Dario Sarrazola Ochoa')
  })

  it('sin documento lo dice, en vez de dejar la línea en blanco', () => {
    render(contrato({ tenantDocument: '', inquilinosDelContrato: null }))
    expect(container.querySelector('[data-testid="documento-del-inquilino"]')?.textContent).toBe(
      'Sin documento',
    )
  })

  it('un contrato migrado sin inquilino lo dice, no inventa una fila vacía', () => {
    render(
      contrato({
        tenantId: null,
        tenantName: '',
        tenantDocument: '',
        tenantEmail: '',
        inquilinosDelContrato: [],
      }),
    )
    expect(container.querySelector('[data-testid="sin-inquilino"]')).not.toBeNull()
  })
})

describe('varios propietarios', () => {
  it('lista los tres con su porcentaje y su parte del canon', () => {
    render(
      contrato({
        propietariosDelContrato: {
          sumaBps: 10_000,
          sumanCien: true,
          propietarios: [
            dueno({ id: 'a', name: 'Ana', participacionBps: 6_000, participacion: '60 %', canonCop: 600_000 }),
            dueno({
              id: 'b',
              name: 'Beto',
              participacionBps: 4_000,
              participacion: '40 %',
              canonCop: 400_000,
              esPrincipal: false,
            }),
          ],
        },
      }),
    )
    const filas = container.querySelectorAll('[data-testid="propietarios-del-contrato"] li')
    expect(filas).toHaveLength(2)
    expect(container.textContent).toContain('Propietarios (2)')
    expect(container.textContent).toContain('60 %')
    expect(container.textContent).toContain('40 %')
    const montos = Array.from(
      container.querySelectorAll('[data-testid="canon-del-propietario"]'),
    ).map((e) => e.textContent)
    expect(montos).toHaveLength(2)
    expect(montos[0]).toContain('del canon')
  })

  it('con un solo dueño no muestra porcentaje ni reparto: sería ruido', () => {
    render(
      contrato({
        propietariosDelContrato: { sumaBps: 10_000, sumanCien: true, propietarios: [dueno({})] },
      }),
    )
    expect(container.textContent).toContain('Ana Gómez')
    expect(container.querySelector('[data-testid="canon-del-propietario"]')).toBeNull()
    expect(container.textContent).not.toContain('100 %')
  })

  it('porcentajes que no suman 100 se AVISAN, no se esconden', () => {
    render(
      contrato({
        propietariosDelContrato: {
          sumaBps: 9_000,
          sumanCien: false,
          propietarios: [
            dueno({ id: 'a', participacionBps: 6_000, participacion: '60 %', canonCop: null }),
            dueno({
              id: 'b',
              name: 'Beto',
              participacionBps: 3_000,
              participacion: '30 %',
              canonCop: null,
              esPrincipal: false,
            }),
          ],
        },
      }),
    )
    const aviso = container.querySelector('[data-testid="participaciones-no-suman"]')
    expect(aviso).not.toBeNull()
    expect(aviso?.textContent).toContain('90 %')
    // Sin reparto: un monto sobre una base torcida se lee como un hecho.
    expect(container.querySelector('[data-testid="canon-del-propietario"]')).toBeNull()
  })

  it('sin la lista del back cae al principal de la consignación, nunca a landlordName', () => {
    render(
      contrato({
        propietariosDelContrato: null,
        propietarioDeLaConsignacion: { id: 'po-9', name: 'Dueño Real', documentNumber: '900' },
      }),
    )
    expect(container.textContent).toContain('Dueño Real')
    expect(container.textContent).not.toContain('victor ortiz')
  })
})

describe('varios inquilinos', () => {
  const conDos = contrato({
    inquilinosDelContrato: [
      {
        id: null,
        userId: 'inq-1',
        nombre: 'Wilson Dario Sarrazola Ochoa',
        documento: '1026150802',
        email: null,
        telefono: null,
        esPrincipal: true,
      },
      {
        id: 'ci-1',
        userId: null,
        nombre: 'Ana Gómez',
        documento: '111',
        email: null,
        telefono: null,
        esPrincipal: false,
      },
    ],
  })

  it('muestra los dos, con el principal marcado y su documento', () => {
    render(conDos)
    expect(container.textContent).toContain('Inquilinos (2)')
    expect(container.querySelectorAll('[data-testid="inquilino-principal"]')).toHaveLength(1)
    const docs = Array.from(
      container.querySelectorAll('[data-testid="documento-del-inquilino"]'),
    ).map((e) => e.textContent)
    expect(docs).toEqual(['1026150802', '111'])
  })

  it('el principal NO se puede quitar: dejaría el contrato sin titular', () => {
    render(conDos)
    const botones = container.querySelectorAll('button[aria-label^="Quitar a"]')
    expect(botones).toHaveLength(1)
    expect(botones[0].getAttribute('aria-label')).toBe('Quitar a Ana Gómez')
  })

  it('quitar un coarrendatario repinta con la lista que devuelve el back', async () => {
    quitarInquilino.mockResolvedValue([
      {
        id: null,
        userId: 'inq-1',
        nombre: 'Wilson Dario Sarrazola Ochoa',
        documento: '1026150802',
        email: null,
        telefono: null,
        esPrincipal: true,
      },
    ])
    render(conDos)
    const boton = container.querySelector('button[aria-label^="Quitar a"]') as HTMLButtonElement
    await act(async () => {
      boton.click()
    })
    expect(quitarInquilino).toHaveBeenCalledWith('c-1', 'ci-1')
    expect(container.textContent).not.toContain('Ana Gómez')
  })

  it('sin permiso de edición no hay botón de agregar ni de quitar', () => {
    render(conDos, false)
    expect(container.querySelector('[data-testid="agregar-inquilino"]')).toBeNull()
    expect(container.querySelector('button[aria-label^="Quitar a"]')).toBeNull()
  })
})

/**
 * 🔴 Nico, 2026-09-13: en la tarjeta «Partes», PROPIETARIO mostraba un solo
 * dueño y no tenía «+ Agregar»; INQUILINO sí. Ahora los dos abren el MISMO
 * diálogo sobre el mandato del inmueble y, al guardar, se relee el contrato.
 */
describe('editar los propietarios desde la tarjeta', () => {
  it('con permiso y mandato hay «Agregar» y «Editar», como los del inquilino', () => {
    render(conDosDuenos())
    expect(container.querySelector('[data-testid="agregar-propietario"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="editar-propietarios"]')).not.toBeNull()
  })

  it('sin permiso de edición no hay botones', () => {
    render(conDosDuenos(), false)
    expect(container.querySelector('[data-testid="agregar-propietario"]')).toBeNull()
    expect(container.querySelector('[data-testid="editar-propietarios"]')).toBeNull()
  })

  it('el mayoritario lleva el chip «Principal», igual que el inquilino principal', () => {
    render(conDosDuenos())
    const chips = container.querySelectorAll('[data-testid="propietario-principal"]')
    expect(chips).toHaveLength(1)
    expect(chips[0].closest('li')?.textContent).toContain('Ana')
  })

  it('el aviso de «no suman 100» enlaza a la ficha del inmueble', () => {
    render(
      contrato({
        propertyId: 'p-1',
        propietariosDelContrato: {
          sumaBps: 9_000,
          sumanCien: false,
          propietarios: [
            dueno({ id: 'a', participacionBps: 6_000, participacion: '60 %', canonCop: null }),
            dueno({ id: 'b', name: 'Beto', participacionBps: 3_000, participacion: '30 %', canonCop: null, esPrincipal: false }),
          ],
        },
      }),
    )
    const enlace = container.querySelector<HTMLAnchorElement>('[data-testid="corregir-en-el-inmueble"]')
    expect(enlace).not.toBeNull()
    expect(enlace!.getAttribute('href')).toContain('/panel/inmobiliaria/inmuebles/p-1')
  })

  it('«Editar» resuelve el mandato por el inmueble del contrato y, al guardar, relee el contrato', async () => {
    getAllConsignaciones.mockResolvedValue([{ id: 'cons-7', propertyId: 'p-1', copropietarios: [] }])
    const releido = conDosDuenos({ id: 'c-1' })
    getById.mockResolvedValue(releido)
    const onActualizado = vi.fn()
    render(conDosDuenos(), true, onActualizado)

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="editar-propietarios"]')!.click()
    })
    expect(getAllConsignaciones).toHaveBeenCalledWith({ propertyId: 'p-1' })
    const dialogo = document.body.querySelector('[data-testid="dialogo-de-duenos"]')
    expect(dialogo?.getAttribute('data-consignacion')).toBe('cons-7')

    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="simular-guardado"]')!.click()
    })
    expect(getById).toHaveBeenCalledWith('c-1')
    expect(onActualizado).toHaveBeenCalledWith(releido)
  })

  it('sin mandato detrás del inmueble se avisa y no se abre nada', async () => {
    getAllConsignaciones.mockResolvedValue([])
    render(conDosDuenos())
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="agregar-propietario"]')!.click()
    })
    expect(document.body.querySelector('[data-testid="dialogo-de-duenos"]')).toBeNull()
  })
})
