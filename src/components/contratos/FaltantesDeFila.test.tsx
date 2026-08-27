/**
 * T-0031/WU-3: dos huecos del checklist original.
 *
 * `inmueble_ocupado` estaba en la unión y en `EXPLICACION` pero SIN rama en
 * el render — una fila podía quedar en un estado que la UI describe y no
 * ofrece salida (N11). `dia_de_pago` ni siquiera estaba en la unión: el
 * archivo real del owner no trae esa columna (F7) y no había forma de
 * completarla desde acá. `EXPLICACION` y el render deben cambiar juntos —
 * es exactamente donde nació el hueco de `inmueble_ocupado`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contracts.service')>(
    '@/lib/api/contracts.service',
  )
  return {
    ...actual,
    contractsApi: {
      migracion: {
        resolver: vi.fn(),
        crearInmueble: vi.fn(),
        registrarPropietario: vi.fn(),
      },
    },
  }
})

import { contractsApi, type FilaDeMigracion } from '@/lib/api/contracts.service'
import { EXPLICACION, FaltantesDeFila } from './FaltantesDeFila'

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

function filaBase(over: Partial<FilaDeMigracion> = {}): FilaDeMigracion {
  return {
    id: 'f-1',
    lote: 'lote-1',
    fila: 0,
    datos: { direccion: 'Cra 1', inquilino: { nombre: 'Ana', correo: 'ana@x.co' } },
    propertyId: 'prop-1',
    propietarioId: null,
    tenantId: null,
    candidatos: [],
    estado: 'PENDIENTE',
    faltantes: [],
    contractId: null,
    overrides: [],
    ...over,
  }
}

function render(fila: FilaDeMigracion) {
  act(() => {
    root.render(<FaltantesDeFila fila={fila} onResuelta={() => {}} />)
  })
}

/** Set a controlled input's value the React-tracked way, then fire input. */
function typeInto(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(el, value)
  act(() => {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('<FaltantesDeFila> — dia_de_pago (T-0031)', () => {
  it('EXPLICACION tiene una entrada propia, no cae al código crudo', () => {
    expect(EXPLICACION.dia_de_pago?.titulo).toBeTruthy()
    expect(EXPLICACION.dia_de_pago?.titulo).not.toBe('dia_de_pago')
  })

  it('renderiza un campo numérico y guarda con el paymentDay ingresado', () => {
    render(filaBase({ faltantes: ['dia_de_pago'] }))

    const input = container.querySelector('input[type="number"]') as HTMLInputElement
    expect(input).toBeTruthy()

    typeInto(input, '5')

    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Guardar'),
    )
    act(() => {
      boton?.click()
    })

    expect(contractsApi.migracion.resolver).toHaveBeenCalledWith('f-1', {
      paymentDay: 5,
    })
  })
})

describe('<FaltantesDeFila> — inmueble_ocupado ya no es un callejón sin salida (N11)', () => {
  it('EXPLICACION lo sigue describiendo', () => {
    expect(EXPLICACION.inmueble_ocupado?.titulo).toBeTruthy()
  })

  it('ofrece reasignar el inmueble (reusa <ElegirInmueble>)', () => {
    render(
      filaBase({
        faltantes: ['inmueble_ocupado'],
        candidatos: [{ id: 'prop-2', address: 'Otra dirección', city: 'Medellín' }],
      }),
    )

    // <ElegirInmueble> ofrece "crear inmueble" cuando no hay candidatos, o
    // los candidatos como botones cuando sí — cualquiera de los dos confirma
    // que la rama existe y no está vacía.
    expect(
      container.textContent?.includes('Otra dirección') ||
        container.textContent?.includes('inmueble no está cargado'),
    ).toBe(true)
  })

  it('ofrece "seguir igual" — persiste permitirInmuebleOcupado', () => {
    render(filaBase({ faltantes: ['inmueble_ocupado'] }))

    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.toLowerCase().includes('seguir igual'),
    )
    expect(boton).toBeTruthy()

    act(() => {
      boton?.click()
    })

    expect(contractsApi.migracion.resolver).toHaveBeenCalledWith('f-1', {
      permitirInmuebleOcupado: true,
    })
  })
})
