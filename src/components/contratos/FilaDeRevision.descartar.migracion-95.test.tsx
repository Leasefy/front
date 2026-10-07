/**
 * CO-21 (QA-MIGRACION-95, 06-10-2026): una fila del lote que no va no tenía
 * salida propia: sólo «Descartar este lote», que se lleva todas las demás. El
 * back tenía `DELETE migrar/filas/:id` y el front `contractsApi.migracion
 * .descartar`, pero ningún botón. Ahora «Descartar esta fila», con su
 * confirmación.
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
    propietariosApi: { ...actual.propietariosApi, getAll: vi.fn() },
  }
})

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/contracts.service')
  >('@/lib/api/contracts.service')
  return {
    ...actual,
    contractsApi: {
      migracion: {
        resolver: vi.fn(),
        crearInmueble: vi.fn(),
        registrarPropietario: vi.fn(),
        corregirPropietario: vi.fn(),
        descartar: vi.fn(),
      },
    },
  }
})

/**
 * El selector es el `Combobox` del DS (Radix Popover adentro). Lo que se
 * prueba acá no es cómo se despliega un popover —eso es del design system—
 * sino a QUÉ endpoint manda esta fila según su estado, que es donde estuvo el
 * bug. Así que se cambia por un botón por propietario: el mismo contrato
 * (`onElegir(p)`), sin depender de las tripas de Radix en happy-dom.
 */
vi.mock('./SelectorDePropietario', () => ({
  SelectorDePropietario: ({
    propietarios,
    onElegir,
    disabled,
    testId,
  }: {
    propietarios: Array<{ id: string; name: string }>
    onElegir: (p: unknown) => void
    disabled?: boolean
    testId?: string
  }) => (
    <div data-testid={testId}>
      {propietarios.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          data-testid={`${testId}-elegir-${p.id}`}
          onClick={() => onElegir(p)}
        >
          {p.name}
        </button>
      ))}
    </div>
  ),
}))

import { contractsApi, type FilaDeMigracion } from '@/lib/api/contracts.service'
import type { Propietario } from '@/lib/types/inmobiliaria'
import { FilaDeRevision } from './FilaDeRevision'

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

const JORGE = {
  id: 'po-1',
  name: 'Jorge Restrepo',
  documentNumber: '71234567',
  email: 'jorge@correo.co',
  phone: '3105551234',
} as unknown as Propietario

function fila(over: Partial<FilaDeMigracion> = {}): FilaDeMigracion {
  return {
    id: 'f-1',
    lote: 'lote-1',
    fila: 0,
    datos: {
      direccion: 'Calle 75 # 57-31',
      inquilino: { nombre: 'Claudia Rodríguez', correo: 'c@x.co' },
      monthlyRent: 2_400_000,
    },
    propertyId: 'prop-1',
    propietarioId: null,
    tenantId: null,
    candidatos: [],
    estado: 'PENDIENTE',
    faltantes: ['propietario'],
    contractId: null,
    propietario: null,
    comisionPorcentaje: null,
    ...over,
  }
}


function pintar(over: Partial<FilaDeMigracion> = {}) {
  const onActualizada = vi.fn()
  const onCambio = vi.fn()
  act(() => {
    root.render(
      <FilaDeRevision fila={fila(over)} propietarios={[JORGE]} seleccionada={false} onSeleccion={() => {}} onActualizada={onActualizada} onCambio={onCambio} />,
    )
  })
  return { onActualizada, onCambio }
}

const boton = (texto: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)

describe('CO-21 · descartar UNA fila del lote, con confirmación', () => {
  it('pide confirmación y llama a descartar ESA fila', async () => {
    const descartar = contractsApi.migracion.descartar as unknown as ReturnType<typeof vi.fn>
    descartar.mockResolvedValue({ ...fila(), estado: 'DESCARTADO' })
    const { onCambio } = pintar()
    act(() => boton('Descartar esta fila')!.click())
    expect(document.body.textContent).toContain('¿Descartar la fila 2?')
    expect(descartar).not.toHaveBeenCalled()
    const confirmar = Array.from(document.querySelectorAll('[role="alertdialog"] button')).find((b) => b.textContent?.includes('Descartar esta fila')) as HTMLButtonElement
    await act(async () => {
      confirmar.click()
      await Promise.resolve()
    })
    expect(descartar).toHaveBeenCalledWith('f-1')
    expect(onCambio).toHaveBeenCalled()
  })

  it('una fila ya activada no ofrece descartarla', () => {
    pintar({ estado: 'ACTIVADO', faltantes: [] })
    expect(boton('Descartar esta fila')).toBeUndefined()
  })
})
