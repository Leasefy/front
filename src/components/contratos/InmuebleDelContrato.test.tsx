/**
 * InmuebleDelContrato — el inventario y el historial del inmueble, desde la
 * ficha del contrato (Nico, 2026-09-12).
 *
 * Lo que se cuida acá: que se monte sobre la consignación del inmueble del
 * contrato con los MISMOS componentes de la ficha del inmueble, que el
 * inventario sea de sólo lectura (se edita donde vive), y que sin consignación
 * se diga en vez de dejar un hueco.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { useConsignacionMock, actaProps, timelineProps, pushMock } = vi.hoisted(() => ({
  useConsignacionMock: vi.fn(),
  actaProps: { ultimo: null as Record<string, unknown> | null },
  timelineProps: { ultimo: null as Record<string, unknown> | null },
  pushMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: Record<string, unknown> & { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignacion: (id: string) => useConsignacionMock(id),
}))

vi.mock('@/components/inmobiliaria/ActaEntregaView', () => ({
  ActaEntregaView: (props: Record<string, unknown>) => {
    actaProps.ultimo = props
    return React.createElement('div', { 'data-testid': 'acta' })
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
  pushMock.mockReset()
  actaProps.ultimo = null
  timelineProps.ultimo = null
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

async function render(propertyId = 'prop-1') {
  await act(async () => {
    root.render(React.createElement(InmuebleDelContrato, { propertyId }))
  })
}

describe('InmuebleDelContrato', () => {
  it('pide la consignación por el inmueble del contrato y monta inventario e historial sobre ella', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: CONSIGNACION, isLoading: false, error: null })

    await render('prop-1')

    expect(useConsignacionMock).toHaveBeenCalledWith('prop-1')
    expect(container.querySelector('[data-testid="acta"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="timeline"]')).not.toBeNull()
    expect(actaProps.ultimo?.inventoryItems).toBe(CONSIGNACION.inventoryItems)
    expect(actaProps.ultimo?.contractDate).toBe('2026-01-15')
    expect(timelineProps.ultimo?.consignacion).toBe(CONSIGNACION)
  })

  it('el historial se llama «Historial del inmueble»: la ficha ya tiene otro historial', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: CONSIGNACION, isLoading: false, error: null })

    await render()

    expect(timelineProps.ultimo?.titulo).toBe('Historial del inmueble')
  })

  it('el inventario es de sólo lectura acá, y el enlace lleva a la ficha del inmueble donde se edita', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: CONSIGNACION, isLoading: false, error: null })

    await render()

    expect(actaProps.ultimo?.onAddItem).toBeUndefined()
    expect(actaProps.ultimo?.onEditItem).toBeUndefined()
    expect(actaProps.ultimo?.onDeleteItem).toBeUndefined()
    const enlace = container.querySelector('[data-testid="editar-inventario-en-el-inmueble"]') as HTMLAnchorElement
    expect(enlace.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/cons-1')

    // Imprimir abre la hoja del acta del inmueble, la misma de siempre.
    ;(actaProps.ultimo?.onPrint as () => void)()
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles/cons-1/acta')
  })

  it('mientras carga no afirma nada', async () => {
    useConsignacionMock.mockReturnValue({ consignacion: null, isLoading: true, error: null })

    await render()

    expect(container.querySelector('[data-testid="inmueble-del-contrato-cargando"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="acta"]')).toBeNull()
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
