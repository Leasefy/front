/**
 * QA con avatares (04-10): «Hacer el inventario» desde el bloqueo de «Nuevo
 * contrato» lleva a la ficha del inmueble y, al volver, el formulario llega
 * con `?inmueble=<propertyId>`: el inmueble queda elegido (como cambio
 * automático, sin pintar errores de lo demás) y se avisa para precargar el
 * canon, igual que si la persona lo hubiera elegido.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Consignacion } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { getAll } = vi.hoisted(() => ({ getAll: vi.fn() }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: { getAll } }))
vi.mock('@/lib/hooks/use-inquilinos', () => ({ useInquilinos: () => ({ inquilinos: [], cargando: false }) }))
vi.mock('@/components/ui/combobox', () => ({ Combobox: () => null }))

import { PARTES_VACIAS, PartesDelContratoManual } from './PartesDelContratoManual'

const consig = (over: Partial<Consignacion>): Consignacion =>
  ({
    id: 'c-1',
    propertyId: 'p-1',
    propertyTitle: 'AVATAR Apartamento La 70',
    propertyAddress: 'Cra 70',
    propertyCode: 52,
    status: 'active',
    availability: 'available',
    listingType: 'rent',
    monthlyRent: 1_800_000,
    ...over,
  }) as unknown as Consignacion

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function montar(pedido: string | null) {
  const onCambio = vi.fn()
  const onInmuebleElegido = vi.fn()
  await act(async () => {
    root.render(
      <PartesDelContratoManual
        valor={PARTES_VACIAS}
        onCambio={onCambio}
        onInmuebleElegido={onInmuebleElegido}
        inmueblePedido={pedido}
      />,
    )
  })
  return { onCambio, onInmuebleElegido }
}

describe('PartesDelContratoManual · el inmueble pedido (vuelta del inventario)', () => {
  it('🔴 llega elegido, como cambio automático, y avisa para precargar el canon', async () => {
    getAll.mockResolvedValue([consig({}), consig({ id: 'c-2', propertyId: 'p-2', propertyTitle: 'Otro' })])
    const { onCambio, onInmuebleElegido } = await montar('p-1')
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ propertyId: 'p-1' }), { automatico: true })
    expect(onInmuebleElegido).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-1' }))
  })

  it('si ya no es elegible (por ejemplo, ya está arrendado), no elige nada', async () => {
    getAll.mockResolvedValue([consig({ availability: 'rented' })])
    const { onCambio } = await montar('p-1')
    expect(onCambio).not.toHaveBeenCalled()
  })

  it('sin pedido no toca nada', async () => {
    getAll.mockResolvedValue([consig({})])
    const { onCambio } = await montar(null)
    expect(onCambio).not.toHaveBeenCalled()
  })
})
