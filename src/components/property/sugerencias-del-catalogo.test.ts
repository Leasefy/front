/**
 * Las sugerencias del buscador salen del catálogo, no de una lista fija.
 * Lo que fija este archivo: se arman con las combinaciones más repetidas,
 * sólo con tipos y ciudades que las píldoras saben mostrar, y nunca más de
 * cuatro. Una lista fija sonaba mejor («2 alcobas en Laureles hasta $3M») y
 * devolvía cero contra el inventario real.
 */
import { describe, expect, it } from 'vitest'
import { sugerenciasDelCatalogo } from './PropertySearchView'
import type { Property } from '@/lib/types/property'

function inmueble(parte: Partial<Property>): Property {
  return { id: Math.random().toString(36).slice(2), type: 'apartment', city: 'Medellín', listingType: 'rent', ...parte } as Property
}

describe('sugerenciasDelCatalogo', () => {
  it('ordena por cuántos inmuebles hay en cada combinación', () => {
    const s = sugerenciasDelCatalogo([
      inmueble({ type: 'house', city: 'Barranquilla' }),
      inmueble({ type: 'apartment', city: 'Medellín' }),
      inmueble({ type: 'apartment', city: 'Medellín' }),
      inmueble({ type: 'apartment', city: 'Medellín' }),
    ])
    expect(s.map((x) => x.texto)).toEqual(['Apartamento en Medellín', 'Casa en Barranquilla'])
    expect(s[0]).toMatchObject({ city: 'Medellín', type: 'apartment' })
  })

  it('distingue venta de arriendo en el texto', () => {
    const s = sugerenciasDelCatalogo([inmueble({ city: 'Bogotá', listingType: 'sale' })])
    expect(s[0].texto).toBe('Apartamento en venta en Bogotá')
  })

  it('deja afuera lo que las píldoras no saben mostrar', () => {
    const s = sugerenciasDelCatalogo([
      inmueble({ type: 'commercial', city: 'Bogotá' }),
      inmueble({ type: 'apartment', city: 'Rionegro' }),
      inmueble({ type: 'studio', city: 'Cali' }),
    ])
    expect(s.map((x) => x.texto)).toEqual(['Estudio en Cali'])
  })

  it('nunca más de cuatro, y con empate ordena por texto', () => {
    const s = sugerenciasDelCatalogo([
      inmueble({ type: 'house', city: 'Cali' }),
      inmueble({ type: 'house', city: 'Bogotá' }),
      inmueble({ type: 'apartment', city: 'Cartagena' }),
      inmueble({ type: 'studio', city: 'Medellín' }),
      inmueble({ type: 'apartment', city: 'Barranquilla' }),
    ])
    expect(s).toHaveLength(4)
    expect(s.map((x) => x.texto)).toEqual([
      'Apartamento en Barranquilla',
      'Apartamento en Cartagena',
      'Casa en Bogotá',
      'Casa en Cali',
    ])
  })

  it('con catálogo vacío no inventa nada', () => {
    expect(sugerenciasDelCatalogo([])).toEqual([])
  })
})
