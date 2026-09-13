/**
 * InmuebleDelContrato — el inventario y el historial del inmueble, desde la
 * ficha del contrato.
 *
 * 🔴 Nico, 2026-09-13: «desde el contrato también debería de agregar todo lo
 * que se pueda agregar del inventario». Hasta ayer esto montaba el inventario
 * en SÓLO LECTURA con un texto que mandaba a la ficha del inmueble; lo que se
 * cuida acá es lo contrario: que monte el MISMO componente de la ficha del
 * inmueble sobre la MISMA consignación, con permiso para editar cuando la
 * persona lo tiene y sin él cuando no, que prepare la página DEL CONTRATO para
 * trabajar sin señal, y que un contrato sin inmueble lo diga en vez de ofrecer
 * cargar un inventario que no tiene dónde vivir.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const {
  useConsignacionMock,
  puedeEditarMock,
  copiaMock,
  argumentosDeLaCopia,
  inventarioProps,
  timelineProps,
  registrarMock,
} = vi.hoisted(() => ({
  useConsignacionMock: vi.fn(),
  puedeEditarMock: vi.fn(() => true),
  copiaMock: {
    copia: null,
    guardadoEn: null as number | null,
    preparando: false,
    ultimaPreparacion: null as boolean | null,
    preparar: vi.fn(() => Promise.resolve(true)),
  },
  argumentosDeLaCopia: { ultimo: null as unknown[] | null },
  inventarioProps: { ultimo: null as Record<string, unknown> | null },
  timelineProps: { ultimo: null as Record<string, unknown> | null },
  registrarMock: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: Record<string, unknown> & { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignacion: (id: string | undefined) => useConsignacionMock(id),
}))

vi.mock('@/lib/hooks/use-puede-editar-inventario', () => ({
  usePuedeEditarInventario: () => puedeEditarMock(),
}))

vi.mock('@/lib/hooks/use-sin-senal', () => ({
  useSinSenal: () => false,
  estaSinSenal: () => false,
}))

vi.mock('@/lib/hooks/use-copia-de-inmueble', () => ({
  useCopiaDeInmueble: (...args: unknown[]) => {
    argumentosDeLaCopia.ultimo = args
    return copiaMock
  },
}))

vi.mock('@/lib/inventario/sw-inventario', () => ({
  registrarServiceWorker: registrarMock,
}))

vi.mock('@/components/inmobiliaria/InventarioDeLaConsignacion', () => ({
  InventarioDeLaConsignacion: (props: Record<string, unknown>) => {
    inventarioProps.ultimo = props
    return React.createElement('div', { 'data-testid': 'inventario' })
  },
}))

vi.mock('@/components/inmobiliaria/ConsignacionTimeline', () => ({
  ConsignacionTimeline: (props: Record<string, unknown>) => {
    timelineProps.ultimo = props
    return React.createElement('div', { 'data-testid': 'timeline' })
  },
}))

import { InmuebleDelContrato } from './InmuebleDelContrato'

const CONSIGNACION = {
  id: 'cons-1',
  propertyId: 'prop-1',
  contractDate: '2026-01-15',
  inventoryItems: [{ id: 'i-1', name: 'Nevera', quantity: 1, condition: 'good' }],
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useConsignacionMock.mockReset()
  puedeEditarMock.mockReset()
  puedeEditarMock.mockReturnValue(true)
  registrarMock.mockClear()
  argumentosDeLaCopia.ultimo = null
  inventarioProps.ultimo = null
  timelineProps.ultimo = null
})

afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
})

async function render(props: { propertyId?: string | null; contratoId?: string } = {}) {
  await act(async () => {
    root.render(
      React.createElement(InmuebleDelContrato, {
        propertyId: 'prop-1',
        contratoId: 'lease-9',
        ...props,
      }),
    )
  })
}

describe('InmuebleDelContrato', () => {
  it('pide la consignación por el inmueble del contrato y monta inventario e historial sobre ella', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: CONSIGNACION, isLoading: false, error: null })

    await render()

    expect(useConsignacionMock).toHaveBeenCalledWith('prop-1')
    expect(container.querySelector('[data-testid="inventario"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="timeline"]')).not.toBeNull()
    expect(inventarioProps.ultimo?.consignacion).toBe(CONSIGNACION)
    expect(timelineProps.ultimo?.consignacion).toBe(CONSIGNACION)
  })

  it('el historial se llama «Historial del inmueble»: la ficha ya tiene otro historial', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: CONSIGNACION, isLoading: false, error: null })

    await render()

    expect(timelineProps.ultimo?.titulo).toBe('Historial del inmueble')
  })

  it('se edita desde acá: el inventario recibe el permiso y el contrato desde el que se abrió', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: CONSIGNACION, isLoading: false, error: null })

    await render({ contratoId: 'lease-9' })

    expect(inventarioProps.ultimo?.puedeEditar).toBe(true)
    expect(inventarioProps.ultimo?.contratoId).toBe('lease-9')
    // Ya no manda a hacer el trabajo a otra pantalla: el enlace es para VER.
    expect(container.textContent).not.toContain('se edita en la ficha del inmueble')
    const enlace = container.querySelector('[data-testid="ver-el-inmueble"]') as HTMLAnchorElement
    expect(enlace.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/cons-1')
  })

  it('quien no puede editar en el inmueble tampoco edita acá', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: CONSIGNACION, isLoading: false, error: null })
    puedeEditarMock.mockReturnValue(false)

    await render()

    expect(inventarioProps.ultimo?.puedeEditar).toBe(false)
  })

  /*
   * El service worker guarda PÁGINAS: preparar desde acá tiene que guardar la
   * del contrato, que es donde la persona va a volver. Guardar la del inmueble
   * dejaría el botón cumpliendo en otra pantalla.
   */
  it('«Preparar para trabajar sin señal» guarda la página del CONTRATO', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: CONSIGNACION, isLoading: false, error: null })

    await render({ contratoId: 'lease-9' })

    expect(argumentosDeLaCopia.ultimo).toEqual([
      'cons-1',
      CONSIGNACION,
      '/panel/inmobiliaria/contratos/lease-9',
    ])
    expect(inventarioProps.ultimo?.copiaLocal).toBe(copiaMock)
    // Sin worker registrado la página no se guarda y el botón mentiría.
    expect(registrarMock).toHaveBeenCalled()
  })

  it('lo que devuelve el back al subir el borrador reemplaza lo que se ve', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: CONSIGNACION, isLoading: false, error: null })
    await render()

    const actualizada = { ...CONSIGNACION, inventoryItems: [] }
    await act(async () => {
      ;(inventarioProps.ultimo?.onActualizada as (c: unknown) => void)(actualizada)
    })

    expect(inventarioProps.ultimo?.consignacion).toBe(actualizada)
  })

  it('un contrato sin inmueble lo dice, y no ofrece cargar inventario', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: null, isLoading: false, error: 'No ID' })

    await render({ propertyId: null })

    expect(container.textContent).toContain('Este contrato no tiene inmueble asociado')
    expect(container.querySelector('[data-testid="inventario"]')).toBeNull()
  })

  it('mientras carga no afirma nada', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: null, isLoading: true, error: null })

    await render()

    expect(container.querySelector('[data-testid="inmueble-del-contrato-cargando"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="inventario"]')).toBeNull()
  })

  it('sin consignación lo dice, y no es lo mismo que «no se pudo traer»', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: null, isLoading: false, error: null })
    await render()
    expect(container.textContent).toContain('no tiene consignación')

    useConsignacionMock.mockReturnValue({ consignacion: null, isLoading: false, error: 'boom' })
    await render()
    expect(container.textContent).toContain('No pudimos traer')
  })
})
