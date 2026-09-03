/**
 * Nuevo contrato a mano: inmueble consignado + inquilino, sin postulación
 * (Nico, 2026-09-03). Las reglas puras se prueban solas; el DOM, lo justo.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Consignacion } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { getAllMock, useInquilinosMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  useInquilinosMock: vi.fn(),
}))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: { getAll: getAllMock } }))
vi.mock('@/lib/hooks/use-inquilinos', () => ({ useInquilinos: useInquilinosMock }))
// El Combobox de cadence se reemplaza por un <select>: lo que se prueba acá
// son las opciones que recibe, no el popover.
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    options,
    value,
    onChange,
    disabled,
    ...rest
  }: {
    options: { value: string; label: string }[]
    value?: string
    onChange: (v: string | undefined) => void
    disabled?: boolean
  }) =>
    React.createElement(
      'select',
      {
        'data-testid': (rest as Record<string, string>)['data-testid'],
        value: value ?? '',
        disabled,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value || undefined),
      },
      [React.createElement('option', { key: '', value: '' }, '—')].concat(
        options.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)),
      ),
    ),
}))
vi.mock('@leasefy/cadence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@leasefy/cadence')>()),
  SegmentedControl: ({
    options,
    value,
    onChange,
  }: {
    options: { value: string; label: string }[]
    value: string
    onChange: (v: string) => void
  }) =>
    React.createElement(
      'div',
      { role: 'radiogroup' },
      options.map((o) =>
        React.createElement(
          'button',
          {
            key: o.value,
            type: 'button',
            'aria-checked': o.value === value,
            'data-testid': `modo-${o.value}`,
            onClick: () => onChange(o.value),
          },
          o.label,
        ),
      ),
    ),
}))

import {
  PARTES_VACIAS,
  PartesDelContratoManual,
  inmueblesParaContrato,
  validarPartes,
  type PartesManuales,
} from './PartesDelContratoManual'

const consig = (over: Partial<Consignacion>): Consignacion =>
  ({
    id: 'c',
    propertyId: 'p',
    propertyTitle: 'Apto',
    propertyAddress: 'Cra 1',
    propertyCode: 1,
    status: 'active',
    availability: 'available',
    listingType: 'rent',
    monthlyRent: 1_000_000,
    ...over,
  }) as unknown as Consignacion

describe('inmueblesParaContrato', () => {
  it('sólo mandatos activos de arriendo, con inmueble y sin arriendo vigente, ordenados por título', () => {
    const lista = inmueblesParaContrato([
      consig({ id: 'z', propertyId: 'pz', propertyTitle: 'Zeta' }),
      consig({ id: 'r', propertyId: 'pr', availability: 'rented' }),
      consig({ id: 'v', propertyId: 'pv', listingType: 'sale' }),
      consig({ id: 't', propertyId: 'pt', status: 'terminated' }),
      consig({ id: 'n', propertyId: '' }),
      consig({ id: 'a', propertyId: 'pa', propertyTitle: 'Alfa' }),
    ])
    expect(lista.map((c) => c.id)).toEqual(['a', 'z'])
  })
})

describe('validarPartes', () => {
  it('sin inmueble ni inquilino dice qué falta', () => {
    expect(Object.keys(validarPartes(PARTES_VACIAS)).sort()).toEqual(['propertyId', 'tenantId'])
  })
  it('un inquilino nuevo necesita nombre, documento y un correo válido', () => {
    const base: PartesManuales = {
      propertyId: 'p',
      inquilino: { modo: 'nuevo', nombre: 'C', documento: '12', correo: 'nada', telefono: '' },
    }
    expect(Object.keys(validarPartes(base)).sort()).toEqual(['correo', 'documento', 'nombre'])
    expect(
      validarPartes({
        propertyId: 'p',
        inquilino: { modo: 'nuevo', nombre: 'Camila R', documento: '1.020.304', correo: 'c@x.co', telefono: '' },
      }),
    ).toEqual({})
  })
  it('un inquilino existente sólo necesita estar elegido', () => {
    expect(validarPartes({ propertyId: 'p', inquilino: { modo: 'existente', tenantId: 't1' } })).toEqual({})
  })
})

describe('PartesDelContratoManual', () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    getAllMock.mockReset()
    useInquilinosMock.mockReset()
    useInquilinosMock.mockReturnValue({
      inquilinos: [{ tenantId: 't1', nombre: 'Beatriz', email: 'b@x.co', telefono: null, arriendos: [] }],
      cargando: false,
      error: null,
      refrescar: vi.fn(),
    })
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('ofrece los inmuebles libres y, al elegir uno, avisa para precargar el canon', async () => {
    getAllMock.mockResolvedValue([
      consig({ id: 'a', propertyId: 'pa', propertyTitle: 'Alfa', propertyCode: 7 }),
      consig({ id: 'r', propertyId: 'pr', availability: 'rented' }),
    ])
    const onCambio = vi.fn()
    const onInmuebleElegido = vi.fn()
    await act(async () => {
      root.render(
        <PartesDelContratoManual valor={PARTES_VACIAS} onCambio={onCambio} onInmuebleElegido={onInmuebleElegido} />,
      )
    })
    await act(async () => {})
    const select = container.querySelector<HTMLSelectElement>('[data-testid="inmueble-combobox"]')!
    const labels = [...select.options].map((o) => o.textContent)
    expect(labels).toEqual(['—', '#7 · Alfa · Cra 1'])

    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
    act(() => {
      setter.call(select, 'pa')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onCambio).toHaveBeenCalledWith({ ...PARTES_VACIAS, propertyId: 'pa' })
    expect(onInmuebleElegido).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('sin inmuebles libres lo dice en vez de mostrar un buscador vacío', async () => {
    getAllMock.mockResolvedValue([consig({ availability: 'rented' })])
    await act(async () => {
      root.render(<PartesDelContratoManual valor={PARTES_VACIAS} onCambio={vi.fn()} />)
    })
    await act(async () => {})
    expect(container.querySelector('[data-testid="sin-inmuebles"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="inmueble-combobox"]')).toBeNull()
  })

  it('«Nuevo» cambia el inquilino a nombre + documento + correo + teléfono', async () => {
    getAllMock.mockResolvedValue([])
    const onCambio = vi.fn()
    await act(async () => {
      root.render(<PartesDelContratoManual valor={PARTES_VACIAS} onCambio={onCambio} />)
    })
    expect(container.querySelector('[data-testid="inquilino-combobox"]')).not.toBeNull()
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="modo-nuevo"]')!.click())
    expect(onCambio).toHaveBeenCalledWith({
      ...PARTES_VACIAS,
      inquilino: { modo: 'nuevo', nombre: '', documento: '', correo: '', telefono: '' },
    })
  })
})
