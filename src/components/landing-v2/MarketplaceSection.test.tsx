/**
 * MarketplaceSection.test.tsx — la vitrina del home no puede afirmar de más.
 *
 * Esta sección vive en una página de marketing, y ahí el modo de falla es
 * distinto al del panel: nadie va a apretar «Intentar de nuevo» en un home.
 * Lo que NO puede pasar es que un fallo de red se lea como «Leasefy no tiene
 * inmuebles» — que es exactamente lo que se vería si el componente sólo
 * mirara `length === 0`, porque quien pierde la petición se queda con la
 * lista vacía (el mismo defecto de `useApiData` que ya nos costó caro).
 *
 * La decisión: si falla, o si de verdad no hay ninguno, la sección se retira
 * entera. Una vitrina ausente no dice nada falso; una vacía sí.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import type { Property } from '@/lib/types/property'

const listMock = vi.fn()
vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: { list: (...a: unknown[]) => listMock(...(a as [])) },
}))

import { MarketplaceSection } from './MarketplaceSection'

/** Un inmueble con lo mínimo que la tarjeta lee. */
function inmueble(over: Partial<Property> = {}): Property {
  return {
    id: 'p1',
    title: 'Apartamento',
    status: 'available',
    city: 'Bogotá',
    neighborhood: 'Chapinero',
    monthlyRent: 2_200_000,
    bedrooms: 2,
    bathrooms: 2,
    area: 72,
    images: [],
    ...over,
  } as Property
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  listMock.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar() {
  await act(async () => {
    root.render(React.createElement(MarketplaceSection))
  })
  // Deja resolver la promesa del fetch y su setState.
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

const SECCION = '[data-testid="landing-marketplace"]'

describe('MarketplaceSection', () => {
  it('muestra los inmuebles que devuelve el backend', async () => {
    listMock.mockResolvedValue({
      data: [inmueble({ id: 'a' }), inmueble({ id: 'b', monthlyRent: 1_500_000 })],
      meta: {},
    })
    await montar()

    expect(container.querySelector(SECCION)).not.toBeNull()
    const tarjetas = container.querySelectorAll('.mkt-card')
    expect(tarjetas).toHaveLength(2)
    // Enlaza a la ficha real, no a un placeholder.
    expect(tarjetas[0].querySelector('a')?.getAttribute('href')).toBe('/propiedades/a')
    expect(container.textContent).toContain('Chapinero, Bogotá')
  })

  it('si la carga FALLA, la sección no se pinta — y no dice que no hay nada', async () => {
    listMock.mockRejectedValue(new Error('Network error'))
    await montar()

    expect(container.querySelector(SECCION)).toBeNull()
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('no hay')
    expect(texto).not.toContain('No hay')
    expect(texto).not.toContain('Encontrá tu próximo arriendo')
  })

  it('sin inmuebles disponibles tampoco se pinta', async () => {
    listMock.mockResolvedValue({ data: [], meta: {} })
    await montar()

    expect(container.querySelector(SECCION)).toBeNull()
  })

  it('descarta los que no están disponibles (el endpoint no filtra por estado)', async () => {
    listMock.mockResolvedValue({
      data: [
        inmueble({ id: 'libre', status: 'available' }),
        inmueble({ id: 'ocupado', status: 'rented' }),
      ],
      meta: {},
    })
    await montar()

    const hrefs = [...container.querySelectorAll('.mkt-card a')].map((a) =>
      a.getAttribute('href'),
    )
    expect(hrefs).toEqual(['/propiedades/libre'])
  })

  it('mientras carga muestra el esqueleto, no un vacío', async () => {
    // Promesa que no resuelve: congela el estado de carga.
    listMock.mockReturnValue(new Promise(() => {}))
    await montar()

    expect(container.querySelector(SECCION)).not.toBeNull()
    expect(container.querySelectorAll('.mkt-skel').length).toBeGreaterThan(0)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
