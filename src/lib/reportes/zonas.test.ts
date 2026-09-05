/**
 * Las zonas del filtro de reportes no pueden salir de la nada.
 *
 * Lo que había en `/panel/inmobiliaria/reportes/page.tsx`: seis nombres
 * quemados —«Zona Norte», «Chapinero», «Usaquen», «El Poblado», «Zona
 * Centro», «Suba»— con el comentario «from mock data» al lado. Los veía igual
 * una agencia de Bogotá, una de Medellín y una de Cali.
 */

import { describe, it, expect } from 'vitest'

import { zonasDelReporte } from './zonas'
import type { OcupacionReport } from '@/lib/types/inmobiliaria'

/** Las seis que estaban quemadas. Ninguna puede volver a aparecer sola. */
const LAS_INVENTADAS = ['Zona Norte', 'Chapinero', 'Usaquen', 'El Poblado', 'Zona Centro', 'Suba']

function reporte(zones: Partial<OcupacionReport['zones'][number]>[]): OcupacionReport {
  return {
    totalProperties: 0,
    totalOccupied: 0,
    totalVacant: 0,
    overallOccupancyRate: 0,
    overallVacancyRate: 0,
    zones: zones as OcupacionReport['zones'],
  }
}

describe('zonasDelReporte', () => {
  it('sin reporte devuelve vacío, no la lista de ejemplo', () => {
    expect(zonasDelReporte(null)).toEqual([])
    expect(zonasDelReporte(undefined)).toEqual([])
  })

  it('nunca inventa una zona que el reporte no trajo', () => {
    for (const entrada of [null, undefined, reporte([])]) {
      const zonas = zonasDelReporte(entrada)
      for (const inventada of LAS_INVENTADAS) {
        expect(zonas).not.toContain(inventada)
      }
    }
  })

  it('devuelve las zonas reales del reporte de ocupación', () => {
    const zonas = zonasDelReporte(
      reporte([{ zone: 'Ciudad Jardín' }, { zone: 'San Fernando' }]),
    )
    expect(zonas).toEqual(['Ciudad Jardín', 'San Fernando'])
  })

  it('descarta nombres vacíos y repetidos', () => {
    const zonas = zonasDelReporte(
      reporte([{ zone: 'Granada' }, { zone: '   ' }, { zone: 'Granada' }, {}]),
    )
    expect(zonas).toEqual(['Granada'])
  })
})
