/**
 * La ficha del contrato, abierta ya estando sin señal.
 *
 * 🔴 Nico, 2026-09-13: «desde el contrato también debería de agregar todo lo
 * que se pueda agregar del inventario». El service worker guarda la página,
 * pero el contrato vive en el back: sin red no hay estado, ni partes, ni
 * cobros. Lo que sí puede estar guardado es la consignación —el inventario es
 * del inmueble— y es exactamente lo que la persona fue a hacer al apartamento.
 *
 * Lo que se cuida: que el fallo de carga NO desaparezca (el contrato sigue sin
 * cargar y hay que poder reintentar), que el inventario aparezca abajo cuando
 * hay copia, y que sin copia no se invente nada.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { inventarioProps } = vi.hoisted(() => ({
  inventarioProps: { ultimo: null as Record<string, unknown> | null },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: Record<string, unknown> & { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('@/lib/hooks/use-puede-editar-inventario', () => ({
  usePuedeEditarInventario: () => true,
}))

vi.mock('@/lib/hooks/use-sin-senal', () => ({
  useSinSenal: () => true,
  estaSinSenal: () => true,
}))

vi.mock('@/components/inmobiliaria/InventarioDeLaConsignacion', () => ({
  InventarioDeLaConsignacion: (props: Record<string, unknown>) => {
    inventarioProps.ultimo = props
    return React.createElement('div', { 'data-testid': 'inventario' })
  },
}))

import { ContratoSinSenal } from './ContratoSinSenal'
import {
  almacenEnMemoria,
  anotarRuta,
  guardarCopia,
  usarAlmacenDeCopias,
} from '@/lib/inventario/copia-de-inmueble'
import {
  almacenEnMemoria as borradoresEnMemoria,
  usarAlmacen as usarAlmacenDeBorradores,
} from '@/lib/inventario/borrador-de-inventario'
import type { Consignacion } from '@/lib/types/inmobiliaria'

function consignacion(id: string, extra: Partial<Consignacion> = {}): Consignacion {
  return {
    id,
    propertyId: `prop-${id}`,
    propietarioId: 'own-1',
    copropietarios: [],
    agenteId: 'agent-1',
    propertyTitle: 'Apto 301',
    propertyAddress: 'Cra 1 # 2-3',
    propertyCity: 'Medellín',
    propertyZone: 'El Poblado',
    propertyType: 'apartment',
    monthlyRent: 1_000_000,
    commissionPercent: 10,
    listingType: 'rent',
    saleCommissionPercent: null,
    propertyCode: null,
    contractDate: '2026-01-01',
    status: 'active',
    availability: 'rented',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    inventoryItems: [{ id: 'it-1', name: 'Nevera', quantity: 1, condition: 'good' }],
    ...extra,
  } as Consignacion
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  usarAlmacenDeCopias(almacenEnMemoria())
  usarAlmacenDeBorradores(borradoresEnMemoria())
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  inventarioProps.ultimo = null
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  usarAlmacenDeCopias(null)
  usarAlmacenDeBorradores(null)
})

async function render(contratoId = 'lease-9') {
  await act(async () => {
    root.render(
      React.createElement(ContratoSinSenal, {
        contratoId,
        children: React.createElement('p', { 'data-testid': 'fallo' }, 'No se pudo cargar el contrato'),
      }),
    )
  })
  await act(async () => {
    await Promise.resolve()
  })
}

describe('<ContratoSinSenal>', () => {
  it('sin copia guardada muestra sólo el fallo: no se inventa un contrato', async () => {
    await render()

    expect(container.querySelector('[data-testid="fallo"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="contrato-sin-senal"]')).toBeNull()
  })

  it('con la copia del inmueble de ese contrato, el inventario se puede seguir cargando', async () => {
    await guardarCopia(consignacion('cons-1', { currentLeaseId: 'lease-9' }), 1_700_000_000_000)

    await render('lease-9')

    expect(container.querySelector('[data-testid="inventario"]')).not.toBeNull()
    expect((inventarioProps.ultimo?.consignacion as Consignacion).id).toBe('cons-1')
    expect(inventarioProps.ultimo?.contratoId).toBe('lease-9')
    expect(inventarioProps.ultimo?.puedeEditar).toBe(true)
    // El fallo sigue: el contrato NO se cargó y hay que poder reintentar.
    expect(container.querySelector('[data-testid="fallo"]')).not.toBeNull()
  })

  it('dice de cuándo es lo guardado: una copia sin fecha es una promesa sin plazo', async () => {
    await guardarCopia(consignacion('cons-1', { currentLeaseId: 'lease-9' }), 1_700_000_000_000)

    await render('lease-9')

    expect(container.textContent).toContain('Apto 301')
    expect(container.textContent).toContain('guardado el')
  })

  it('también encuentra la copia por la página que se preparó desde ese contrato', async () => {
    await guardarCopia(consignacion('cons-2'), 1_000)
    await anotarRuta('cons-2', '/panel/inmobiliaria/contratos/lease-borrador')

    await render('lease-borrador')

    expect((inventarioProps.ultimo?.consignacion as Consignacion).id).toBe('cons-2')
  })
})
