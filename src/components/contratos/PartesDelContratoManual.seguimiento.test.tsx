/**
 * Nico (03-10-2026, CR-14; SEGUIMIENTO-FRONT): el borrador del contrato manual
 * nace SIN la cuenta del inquilino nuevo, así que su CORREO es OBLIGATORIO
 * (para que siempre se lo pueda invitar al portal). Preparación copiada de
 * `PartesDelContratoManual.test.tsx`.
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

describe('el correo del inquilino nuevo es obligatorio (Nico, CR-14)', () => {
  it('🔴 vacío: lo pide con su porqué', () => {
    const errores = validarPartes({
      propertyId: 'p',
      inquilino: { modo: 'nuevo', nombre: 'Camila R', documento: '1020304', correo: '  ', telefono: '' },
    })
    expect(errores.correo).toBe('Escribe el correo: es obligatorio para invitarlo al portal y que firme.')
  })

  it('mal escrito: el mensaje de siempre', () => {
    const errores = validarPartes({
      propertyId: 'p',
      inquilino: { modo: 'nuevo', nombre: 'Camila R', documento: '1020304', correo: 'nada', telefono: '' },
    })
    expect(errores.correo).toBe('Escribe un correo válido: ahí le llega la invitación.')
  })

  it('🔴 el campo se ve obligatorio (asterisco, `aria-required` y la ayuda)', async () => {
    getAllMock.mockResolvedValue([])
    useInquilinosMock.mockReturnValue({ inquilinos: [], cargando: false, error: null })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <PartesDelContratoManual
          valor={{ propertyId: '', inquilino: { modo: 'nuevo', nombre: '', documento: '', correo: '', telefono: '' } }}
          onCambio={() => {}}
        />,
      )
    })
    const input = container.querySelector<HTMLInputElement>('[data-testid="nuevo-correo"]')!
    expect(input.getAttribute('aria-required')).toBe('true')
    expect(container.querySelector('label[for="nuevo-correo"]')!.textContent).toBe('Correo*')
    expect(container.textContent).toContain('Obligatorio: ahí le llega la invitación al portal.')
    act(() => root.unmount())
    container.remove()
  })
})
