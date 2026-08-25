/**
 * Un inmueble sin fotos no tiene "una foto vacía".
 *
 * `allImages` era `images.length > 0 ? images : [thumbnailUrl]`. Cuando no
 * había ninguna de las dos quedaba `[undefined]` y se pintaba un `<img src="">`:
 * el ícono de imagen rota del navegador y el texto alternativo desbordado
 * encima de las etiquetas. En el catálogo se leía «[demo] Apartamento
 * Chapinero para comparar - 1» tapando la tarjeta.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { PropertyCard } from './PropertyCard'
import type { Property } from '@/lib/types/property'

const BASE = {
  id: 'p1',
  title: 'Apartamento en Chapinero',
  description: '',
  type: 'apartment',
  status: 'available',
  city: 'Bogotá',
  neighborhood: 'Chapinero',
  address: 'Calle 93',
  latitude: 4.6,
  longitude: -74.06,
  monthlyRent: 2_200_000,
  adminFee: 0,
  deposit: 0,
  bedrooms: 2,
  bathrooms: 2,
  area: 72,
  amenities: [],
} as unknown as Property

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(property: Property) {
  act(() => {
    root.render(<PropertyCard property={property} />)
  })
}

/** Un `src` vacío es exactamente lo que pinta el ícono de rota. */
function imagenesConSrcVacio() {
  return [...container.querySelectorAll('img')].filter((i) => {
    const src = i.getAttribute('src')
    return src === null || src.trim() === ''
  })
}

describe('PropertyCard — sin fotos', () => {
  it('sin imágenes ni miniatura no pinta una imagen rota', () => {
    montar({ ...BASE, images: [], thumbnailUrl: undefined } as unknown as Property)
    expect(imagenesConSrcVacio()).toHaveLength(0)
  })

  it('muestra el vacío a propósito', () => {
    montar({ ...BASE, images: [], thumbnailUrl: undefined } as unknown as Property)
    const vacio = container.querySelector('[data-testid="inmueble-sin-fotos"]')
    expect(vacio).not.toBeNull()
    expect(vacio?.textContent).toBe('Sin fotos')
  })

  it('una miniatura vacía no cuenta como foto', () => {
    // El caso real de la base: `thumbnailUrl: ''`, no `undefined`.
    montar({ ...BASE, images: [], thumbnailUrl: '' } as unknown as Property)
    expect(container.querySelector('[data-testid="inmueble-sin-fotos"]')).not.toBeNull()
    expect(imagenesConSrcVacio()).toHaveLength(0)
  })

  it('descarta las vacías pero conserva las buenas', () => {
    montar({
      ...BASE,
      images: ['', 'https://ejemplo.co/foto.jpg', '   '],
    } as unknown as Property)
    expect(container.querySelector('[data-testid="inmueble-sin-fotos"]')).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('con fotos no muestra el vacío', () => {
    montar({ ...BASE, images: ['https://ejemplo.co/a.jpg'] } as unknown as Property)
    expect(container.querySelector('[data-testid="inmueble-sin-fotos"]')).toBeNull()
  })
})
