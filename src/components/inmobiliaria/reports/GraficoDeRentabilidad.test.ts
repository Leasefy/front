/**
 * El Top 10 de Rentabilidad (QA 20-10, REP-5): en el lab pintaba ocho
 * inmuebles en $0 sin barra, y los nombres largos se partían en tres líneas
 * que se montaban unas sobre otras.
 */

import { describe, it, expect } from 'vitest'

import type { RentabilidadFila } from '@/lib/types/inmobiliaria'
import {
  LARGO_DE_LA_ETIQUETA,
  cuantosEnElGrafico,
  etiquetaDelInmueble,
  etiquetaEnUnaLinea,
  topPorNeto,
} from './GraficoDeRentabilidad'

const fila = (x: Partial<RentabilidadFila>): RentabilidadFila =>
  ({
    consignacionId: 'c',
    propertyTitle: 'Apto',
    codigo: null,
    netoPropietarioCop: 0,
    recaudadoCop: 0,
    comisionCop: 0,
    gastosMantenimientoCop: 0,
    ...x,
  }) as RentabilidadFila

describe('topPorNeto', () => {
  it('sólo entran los que dejaron neto, de mayor a menor', () => {
    const filas = [
      fila({ consignacionId: 'a', netoPropietarioCop: 0 }),
      fila({ consignacionId: 'b', netoPropietarioCop: 3_700_200 }),
      fila({ consignacionId: 'c', netoPropietarioCop: -50_000 }),
      fila({ consignacionId: 'd', netoPropietarioCop: 5_550_300 }),
    ]
    expect(topPorNeto(filas).map((p) => p.consignacionId)).toEqual(['d', 'b'])
    expect(cuantosEnElGrafico(filas)).toBe(2)
  })

  it('nunca más de diez', () => {
    const filas = Array.from({ length: 14 }, (_, i) => fila({ consignacionId: `x${i}`, netoPropietarioCop: 1000 + i }))
    expect(cuantosEnElGrafico(filas)).toBe(10)
  })

  it('sin neto en ninguno, el gráfico no tiene barras', () => {
    expect(cuantosEnElGrafico([fila({ netoPropietarioCop: 0 })])).toBe(0)
  })

  it('no reordena la lista que recibe', () => {
    const filas = [fila({ consignacionId: 'a', netoPropietarioCop: 1 }), fila({ consignacionId: 'b', netoPropietarioCop: 2 })]
    topPorNeto(filas)
    expect(filas.map((f) => f.consignacionId)).toEqual(['a', 'b'])
  })
})

describe('etiquetaEnUnaLinea', () => {
  it('el nombre corto queda igual', () => {
    expect(etiquetaEnUnaLinea('Casa en Bello · #2946')).toBe('Casa en Bello · #2946')
    expect(etiquetaEnUnaLinea('Casa en Envigado')).toBe('Casa en Envigado')
  })

  it('el largo corta el título con «…» y deja el código entero', () => {
    const etiqueta = etiquetaDelInmueble({ propertyTitle: 'Apartaestudio en Barrios Unidos, Caldas', codigo: 2291 })
    const corta = etiquetaEnUnaLinea(etiqueta)
    expect(corta.length).toBeLessThanOrEqual(LARGO_DE_LA_ETIQUETA)
    expect(corta.endsWith('… · #2291')).toBe(true)
    expect(corta.startsWith('Apartaestudio en')).toBe(true)
  })

  it('sin código, sólo se corta el título', () => {
    const corta = etiquetaEnUnaLinea('Apartamento en Bellavista, Caldas, segundo piso')
    expect(corta.length).toBeLessThanOrEqual(LARGO_DE_LA_ETIQUETA)
    expect(corta.endsWith('…')).toBe(true)
  })
})
