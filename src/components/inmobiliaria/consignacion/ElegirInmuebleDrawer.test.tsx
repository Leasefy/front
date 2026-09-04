/**
 * El drawer de «uno que ya tengo»: busca, elige, y dice la verdad cuando no
 * hay nada. Nico (2026-09-02): «si es existente le muestras en un drawer los
 * que tenemos con un buscador para que pueda decir cuál es».
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) =>
      p ? `${k}:${Object.values(p).join(',')}` : k,
  }),
}))

import { ElegirInmuebleDrawer, filtrarInmuebles } from './ElegirInmuebleDrawer'

function inmueble(p: Partial<InmuebleSinConsignacion>): InmuebleSinConsignacion {
  return {
    propertyId: 'p1',
    propertyTitle: 'Apartamento en Chapinero',
    propertyAddress: 'Cra 1 # 2-3',
    propertyCity: 'Bogotá',
    propertyZone: 'Chapinero',
    propertyType: 'apartment',
    propertyThumbnail: null,
    monthlyRent: 2_000_000,
    adminFee: 0,
    status: 'draft',
    createdAt: '2026-01-01',
    ...p,
  } as InmuebleSinConsignacion
}

const LISTA = [
  inmueble({ propertyId: 'a', propertyTitle: 'Apartamento en Chapinero', propertyAddress: 'Cra 1 # 2-3', code: 12 }),
  inmueble({ propertyId: 'b', propertyTitle: 'Casa en El Poblado', propertyAddress: 'Calle 10 Sur # 43-9', propertyCity: 'Medellín', propertyZone: 'El Poblado', code: 34 }),
  inmueble({ propertyId: 'c', propertyTitle: 'Local en Sabaneta', propertyAddress: 'Diagonal 50 # 70-12', propertyCity: 'Sabaneta', monthlyRent: null, salePrice: 500_000_000, code: 56 }),
]

let container: HTMLDivElement | undefined
let root: Root | undefined
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  container?.remove()
  document.body.innerHTML = ''
})

function montar(props: Partial<React.ComponentProps<typeof ElegirInmuebleDrawer>> = {}) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  const onElegir = vi.fn()
  const onOpenChange = vi.fn()
  act(() => {
    r.render(
      <ElegirInmuebleDrawer
        abierto
        onOpenChange={onOpenChange}
        inmuebles={LISTA}
        onElegir={onElegir}
        {...props}
      />,
    )
  })
  return { onElegir, onOpenChange }
}

const filas = () => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="elegir-inmueble-fila"]'))
const buscador = () => document.querySelector<HTMLInputElement>('[data-testid="buscar-inmueble"]')!

function escribir(valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(buscador(), valor)
    buscador().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('filtrarInmuebles', () => {
  it('busca por título, dirección, barrio, ciudad y código', () => {
    expect(filtrarInmuebles(LISTA, 'poblado').map((i) => i.propertyId)).toEqual(['b'])
    expect(filtrarInmuebles(LISTA, '#56').map((i) => i.propertyId)).toEqual(['c'])
    expect(filtrarInmuebles(LISTA, 'cra 1').map((i) => i.propertyId)).toEqual(['a'])
  })

  it('ignora acentos y mayúsculas: «medellin» encuentra «Medellín»', () => {
    expect(filtrarInmuebles(LISTA, 'MEDELLIN').map((i) => i.propertyId)).toEqual(['b'])
  })

  it('sin consulta devuelve todo', () => {
    expect(filtrarInmuebles(LISTA, '  ')).toHaveLength(3)
  })
})

describe('<ElegirInmuebleDrawer>', () => {
  it('lista todos los inmuebles y elegir uno lo devuelve', () => {
    const { onElegir } = montar()
    expect(filas()).toHaveLength(3)
    act(() => filas()[1].click())
    expect(onElegir).toHaveBeenCalledTimes(1)
    expect(onElegir.mock.calls[0][0].propertyId).toBe('b')
  })

  it('el buscador filtra la lista en vivo', () => {
    montar()
    escribir('sabaneta')
    expect(filas()).toHaveLength(1)
    expect(filas()[0].dataset.propertyId).toBe('c')
  })

  it('sin coincidencias lo dice, y no se confunde con «no hay ninguno»', () => {
    montar()
    escribir('zzzz')
    expect(document.querySelector('[data-testid="elegir-inmueble-sin-resultados"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="elegir-inmueble-vacio"]')).toBeNull()
  })

  it('sin inmuebles muestra el vacío honesto', () => {
    montar({ inmuebles: [] })
    expect(document.querySelector('[data-testid="elegir-inmueble-vacio"]')).not.toBeNull()
    expect(filas()).toHaveLength(0)
  })

  it('una venta no inventa un canon de $0', () => {
    montar()
    escribir('sabaneta')
    expect(filas()[0].textContent).toContain('enVenta')
    expect(filas()[0].textContent).not.toContain('porMes')
  })

  it('«no está en la lista» cae al flujo de inmueble nuevo', () => {
    const onCrearNuevo = vi.fn()
    montar({ onCrearNuevo })
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="elegir-inmueble-crear-nuevo"]')!.click())
    expect(onCrearNuevo).toHaveBeenCalledTimes(1)
  })

  it('mientras carga no dice «no tenés inmuebles»', () => {
    montar({ inmuebles: [], cargando: true })
    expect(document.querySelector('[data-testid="elegir-inmueble-vacio"]')).toBeNull()
  })
})
