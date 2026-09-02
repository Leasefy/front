/**
 * Vincular un inmueble a un contrato que llegó sin uno.
 *
 * Lo que se protege: que el inmueble se pueda ENCONTRAR. Nico (2026-09-02):
 * «un select con buscador para que no tenga que hacer mucho scroll; si tiene
 * el id de la propiedad, el nombre, etc., que lo pueda encontrar». El
 * `Combobox` de cadence filtra por `label`, así que la garantía real es que
 * el código, el título y la dirección estén DENTRO de la etiqueta — y que los
 * arrendados vayan al final, marcados, porque casi nunca son el que se busca.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/inmobiliaria.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/inmobiliaria.service')
  >('@/lib/api/inmobiliaria.service')
  return {
    ...actual,
    consignacionesApi: { ...actual.consignacionesApi, getAll: vi.fn() },
  }
})

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/contracts.service')
  >('@/lib/api/contracts.service')
  return {
    ...actual,
    contractsApi: { ...actual.contractsApi, asignarInmueble: vi.fn() },
  }
})

/*
 * El `Combobox` del DS es un Radix Popover: cómo se despliega no es de esta
 * prueba. Se cambia por una lista de botones con la MISMA etiqueta que el
 * DS filtraría, que es exactamente lo que se quiere mirar.
 */
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    options,
    onChange,
    searchPlaceholder,
  }: {
    options: Array<{ value: string; label: string }>
    onChange: (v: string | undefined) => void
    searchPlaceholder?: string
  }) => (
    <div data-testid="combobox" data-search={searchPlaceholder}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          data-testid={`opcion-${o.value}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  ),
}))

import { consignacionesApi } from '@/lib/api/inmobiliaria.service'
import { contractsApi } from '@/lib/api/contracts.service'
import type { Consignacion } from '@/lib/types/inmobiliaria'
import type { Contract } from '@/lib/types/contract'
import { VincularInmueble, etiquetaDeInmueble } from './VincularInmueble'

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

const consignacion = (over: Partial<Consignacion>): Consignacion =>
  ({
    id: `k-${over.propertyId}`,
    propietarioId: 'po-1',
    agenteId: 'ag-1',
    propertyTitle: 'Inmueble',
    propertyAddress: '',
    propertyCity: 'Medellín',
    propertyZone: '',
    propertyType: 'apartment',
    monthlyRent: 1_500_000,
    listingType: 'rent',
    saleCommissionPercent: null,
    propertyCode: null,
    commissionPercent: 10,
    contractDate: '2025-01-01',
    status: 'active',
    availability: 'available',
    ...over,
  }) as Consignacion

const LIBRE_144 = consignacion({
  propertyId: 'p-144',
  propertyCode: 144,
  propertyTitle: 'Local en Provenza',
  propertyAddress: 'Carrera 63 # 90-29 Local 2',
})
const ARRENDADO_7 = consignacion({
  propertyId: 'p-7',
  propertyCode: 7,
  propertyTitle: 'Apartaestudio en Gran América',
  propertyAddress: 'Carrera 30a #25A-20',
  availability: 'rented',
})
const LIBRE_SIN_CODIGO = consignacion({
  propertyId: 'p-x',
  propertyTitle: 'Bodega Itagüí',
})

const CONTRATO = {
  id: 'c-1',
  propertyId: null,
  propertyAddress: 'Carrera 63 # 90-29 Local 2',
} as unknown as Contract

async function abrir(props: Partial<React.ComponentProps<typeof VincularInmueble>> = {}) {
  const onActualizado = vi.fn()
  await act(async () => {
    root.render(
      <VincularInmueble
        contract={CONTRATO}
        puedeVincular
        onActualizado={onActualizado}
        {...props}
      />,
    )
  })
  await act(async () => {
    ;(document.querySelector('[data-testid="vincular-inmueble"]') as HTMLButtonElement).click()
  })
  // La lista se pide al abrir; esperar a que llegue.
  await act(async () => {})
  return { onActualizado }
}

describe('etiquetaDeInmueble', () => {
  it('pone el código, el título y la dirección en la misma etiqueta (es lo que hace buscable a cada uno)', () => {
    expect(etiquetaDeInmueble(LIBRE_144)).toBe(
      '#144 · Local en Provenza · Carrera 63 # 90-29 Local 2',
    )
  })

  it('marca el arrendado y no inventa un código cuando no lo hay', () => {
    expect(etiquetaDeInmueble(ARRENDADO_7)).toBe(
      '#7 · Apartaestudio en Gran América · Carrera 30a #25A-20 · arrendado',
    )
    expect(etiquetaDeInmueble(LIBRE_SIN_CODIGO)).toBe('Bodega Itagüí')
  })
})

describe('VincularInmueble', () => {
  it('lista los inmuebles con buscador por código, nombre o dirección, y los arrendados al final', async () => {
    vi.mocked(consignacionesApi.getAll).mockResolvedValue([ARRENDADO_7, LIBRE_144, LIBRE_SIN_CODIGO])
    await abrir()

    expect(consignacionesApi.getAll).toHaveBeenCalledWith({ status: 'ACTIVE' })
    const combo = document.querySelector('[data-testid="combobox"]') as HTMLElement
    expect(combo.dataset.search).toBe('Código, nombre o dirección…')
    const etiquetas = Array.from(combo.querySelectorAll('button')).map((b) => b.textContent)
    expect(etiquetas).toEqual([
      'Bodega Itagüí',
      '#144 · Local en Provenza · Carrera 63 # 90-29 Local 2',
      '#7 · Apartaestudio en Gran América · Carrera 30a #25A-20 · arrendado',
    ])
  })

  it('con el inmueble elegido, «Vincular» manda el propertyId y devuelve el contrato actualizado', async () => {
    vi.mocked(consignacionesApi.getAll).mockResolvedValue([LIBRE_144])
    const actualizado = { ...CONTRATO, propertyId: 'p-144' } as Contract
    vi.mocked(contractsApi.asignarInmueble).mockResolvedValue(actualizado)
    const { onActualizado } = await abrir()

    const guardar = document.querySelector(
      '[data-testid="vincular-inmueble-guardar"]',
    ) as HTMLButtonElement
    expect(guardar.disabled).toBe(true)

    await act(async () => {
      ;(document.querySelector('[data-testid="opcion-p-144"]') as HTMLButtonElement).click()
    })
    expect(guardar.disabled).toBe(false)
    await act(async () => {
      guardar.click()
    })

    expect(contractsApi.asignarInmueble).toHaveBeenCalledWith('c-1', 'p-144')
    expect(onActualizado).toHaveBeenCalledWith(actualizado)
  })

  it('un inmueble con otro contrato vivo se rechaza y el motivo se queda en el diálogo', async () => {
    vi.mocked(consignacionesApi.getAll).mockResolvedValue([ARRENDADO_7])
    vi.mocked(contractsApi.asignarInmueble).mockRejectedValue(
      new Error('Ese inmueble ya tiene un contrato vivo. Primero hay que cerrar ese contrato.'),
    )
    const { onActualizado } = await abrir()

    await act(async () => {
      ;(document.querySelector('[data-testid="opcion-p-7"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(document.querySelector('[data-testid="vincular-inmueble-guardar"]') as HTMLButtonElement).click()
    })

    expect(onActualizado).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Ese inmueble ya tiene un contrato vivo')
  })

  it('sin permiso no muestra el botón', async () => {
    await act(async () => {
      root.render(
        <VincularInmueble contract={CONTRATO} puedeVincular={false} onActualizado={vi.fn()} />,
      )
    })
    expect(document.querySelector('[data-testid="vincular-inmueble"]')).toBeNull()
  })
})
