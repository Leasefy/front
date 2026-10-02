/**
 * «Nueva solicitud» radica de verdad: nombre + asunto habilitan el botón y el
 * payload que sale es el contrato del back, sin campos vacíos.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { crearMock, toastMock } = vi.hoisted(() => ({
  crearMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('@/lib/api/pqrs-agencia.service', () => ({ pqrsApi: { crear: crearMock } }))
// El responsable viene preelegido con quien radica: acá la sesión es de otra
// persona (`u-otro`), así que la preelección no aplica y el campo arranca vacío.
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u-otro' } }) }))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignaciones: () => ({ consignaciones: [] }),
  useAgentes: () => ({
    agentes: [
      { id: 'm1', userId: 'u1', name: 'Ana Agente' },
      { id: 'm2', name: 'Invitado sin usuario' },
    ],
  }),
}))
vi.mock('@/components/contratos/VincularInmueble', () => ({
  etiquetaDeInmueble: (c: { propertyTitle: string }) => c.propertyTitle,
}))
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
            'data-testid': `solicitante-${o.value}`,
            onClick: () => onChange(o.value),
          },
          o.label,
        ),
      ),
    ),
}))

import { NuevaPqrsDrawer } from './NuevaPqrsDrawer'

const q = <T extends Element>(sel: string) => document.body.querySelector<T>(sel)

function escribir(input: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, valor)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function elegir(select: HTMLSelectElement, valor: string) {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, valor)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('NuevaPqrsDrawer', () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    crearMock.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('con nombre y asunto se habilita «Radicar» y manda sólo lo que se llenó', async () => {
    const onCreated = vi.fn()
    const onOpenChange = vi.fn()
    crearMock.mockResolvedValue({ id: 'p1', radicado: 'PQRS-0007' })

    await act(async () => {
      root.render(<NuevaPqrsDrawer open onOpenChange={onOpenChange} onCreated={onCreated} />)
    })

    const radicar = q<HTMLButtonElement>('[data-testid="pqrs-radicar"]')!
    expect(radicar.disabled).toBe(true)

    act(() => escribir(q<HTMLInputElement>('[data-testid="pqrs-nombre"]')!, '  Camila Ríos '))
    expect(radicar.disabled).toBe(true)
    act(() => escribir(q<HTMLInputElement>('[data-testid="pqrs-asunto"]')!, 'Gotera en el baño'))
    // Todavía falta el responsable: una PQRS no puede quedar sin quien
    // responda (Nico, 2026-09-15), así que «Radicar» sigue apagado.
    expect(radicar.disabled).toBe(true)

    act(() => q<HTMLButtonElement>('[data-testid="solicitante-PROPIETARIO"]')!.click())

    // Sólo los agentes con usuario se pueden asignar (el valor es el userId).
    const asignado = q<HTMLSelectElement>('[data-testid="pqrs-asignado"]')!
    expect([...asignado.options].map((o) => o.value)).toEqual(['', 'u1'])
    act(() => elegir(asignado, 'u1'))
    expect(radicar.disabled).toBe(false)

    // Sin inmuebles consignados el buscador queda deshabilitado, no vacío.
    expect(q<HTMLSelectElement>('[data-testid="pqrs-inmueble"]')!.disabled).toBe(true)

    await act(async () => {
      q<HTMLFormElement>('[data-testid="nueva-pqrs-form"]')!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    expect(crearMock).toHaveBeenCalledTimes(1)
    expect(crearMock.mock.calls[0][0]).toEqual({
      tipo: 'PETICION',
      solicitanteTipo: 'PROPIETARIO',
      solicitanteNombre: 'Camila Ríos',
      asunto: 'Gotera en el baño',
      asignadoAUserId: 'u1',
    })
    expect(toastMock.success).toHaveBeenCalledWith('Solicitud radicada · PQRS-0007')
    expect(onCreated).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('si el back rechaza, avisa y no cierra', async () => {
    const { ApiError } = await import('@/lib/api/client')
    crearMock.mockRejectedValue(new ApiError(400, 'asunto es obligatorio'))
    const onCreated = vi.fn()
    const onOpenChange = vi.fn()
    await act(async () => {
      root.render(<NuevaPqrsDrawer open onOpenChange={onOpenChange} onCreated={onCreated} />)
    })
    act(() => escribir(q<HTMLInputElement>('[data-testid="pqrs-nombre"]')!, 'Camila'))
    act(() => escribir(q<HTMLInputElement>('[data-testid="pqrs-asunto"]')!, 'Gotera'))
    act(() => elegir(q<HTMLSelectElement>('[data-testid="pqrs-asignado"]')!, 'u1'))
    await act(async () => {
      q<HTMLFormElement>('[data-testid="nueva-pqrs-form"]')!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo radicar la solicitud', {
      description: 'asunto es obligatorio',
    })
    expect(onCreated).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  async function radicarCon(fallo: unknown) {
    crearMock.mockRejectedValue(fallo)
    await act(async () => {
      root.render(<NuevaPqrsDrawer open onOpenChange={vi.fn()} onCreated={vi.fn()} />)
    })
    act(() => escribir(q<HTMLInputElement>('[data-testid="pqrs-nombre"]')!, 'Camila'))
    act(() => escribir(q<HTMLInputElement>('[data-testid="pqrs-asunto"]')!, 'Gotera'))
    act(() => elegir(q<HTMLSelectElement>('[data-testid="pqrs-asignado"]')!, 'u1'))
    await act(async () => {
      q<HTMLFormElement>('[data-testid="nueva-pqrs-form"]')!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })
  }

  it('🔴 02-10 · un 400 con campos: el error bajo SU campo y el foco ahí, sin aviso', async () => {
    const { ApiError } = await import('@/lib/api/client')
    const frase = 'El asunto no puede tener más de 200 caracteres.'
    await radicarCon(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'asunto', regla: 'longitud_maxima', mensaje: frase }],
      }),
    )
    expect(q('#pqrs-asunto-error')?.textContent).toBe(frase)
    expect(document.activeElement).toBe(q('#pqrs-asunto'))
    expect(toastMock.error).not.toHaveBeenCalled()
  })

  it('🔴 02-10 · un motivo largo llega entero (antes se cortaba en 160)', async () => {
    const { ApiError } = await import('@/lib/api/client')
    const largo =
      'Ese inmueble ya no está consignado en tu inmobiliaria: se retiró de la administración la semana pasada. Radica la solicitud sin inmueble o con el inmueble nuevo del inquilino.'
    expect(largo.length).toBeGreaterThan(160)
    await radicarCon(new ApiError(409, largo))
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo radicar la solicitud', { description: largo })
  })

  it('🔴 02-10 · un 5xx dice que falló de nuestro lado, con la referencia; sin respuesta, la conexión', async () => {
    const { ApiError } = await import('@/lib/api/client')
    await radicarCon(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
    )
    const de5xx = toastMock.error.mock.calls[0]?.[1]?.description as string
    expect(de5xx).toContain('de nuestro lado')
    expect(de5xx).toContain('ab12cd34')

    crearMock.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await act(async () => {
      q<HTMLFormElement>('[data-testid="nueva-pqrs-form"]')!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })
    expect(toastMock.error.mock.calls[1]?.[1]?.description).toMatch(/conexi[oó]n/i)
  })
})
