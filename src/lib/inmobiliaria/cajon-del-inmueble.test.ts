/**
 * Lo que fija este archivo es UNA cosa: los cajones suman el total.
 *
 * El 19-09, en el navegador, «Inmuebles» decía 133 arriba y sus cuatro fichas
 * sumaban 109. Ninguna prueba lo veía porque cada número estaba bien por
 * separado: nadie había verificado que sumaran.
 */

import { describe, expect, it } from 'vitest'
import {
  CAJONES_DEL_INMUEBLE,
  cajonDelInmueble,
  contarPorCajon,
  estaArrendado,
} from './cajon-del-inmueble'
import type { Consignacion, PortafolioRow } from '@/lib/types/inmobiliaria'

function mandato(sobre: Partial<Consignacion> = {}): PortafolioRow {
  return {
    kind: 'consignacion',
    id: 'c1',
    availability: 'available',
    ...sobre,
  } as PortafolioRow
}

const SIN_MANDATO = { kind: 'sinMandato', propertyId: 'p1' } as PortafolioRow

describe('cajonDelInmueble', () => {
  it('un inmueble cargado sin mandato tiene su propio cajón', () => {
    // 🔴 Las 25 filas que no estaban en ninguna de las cuatro fichas.
    expect(cajonDelInmueble(SIN_MANDATO)).toBe('sinMandato')
  })

  it('🔴 el CONTRATO manda sobre la disponibilidad del mandato', () => {
    /*
     * Nico, 12-09: «no me está relacionando bien los inmuebles arrendados
     * porque tengo 741 contratos activos pero me dice que sólo tengo 674».
     * En lo migrado el mandato quedó diciendo «disponible» sobre inmuebles
     * ocupados, así que el contrato es el que decide.
     */
    expect(cajonDelInmueble(mandato({ arrendado: true, availability: 'available' }))).toBe(
      'arrendado',
    )
    expect(cajonDelInmueble(mandato({ arrendado: true, availability: 'maintenance' }))).toBe(
      'arrendado',
    )
  })

  it('🔴 un arrendado en mantenimiento cae en UN cajón, no en dos', () => {
    /*
     * El defecto exacto de la pantalla: «Arrendadas» preguntaba por el
     * contrato y «Mantenimiento» por la disponibilidad sin descontar la
     * anterior, así que el único inmueble MAINTENANCE con contrato sumaba en
     * las dos y 3 + 105 + 0 + 1 daba 109 sobre 108 mandatos.
     */
    const filas = [mandato({ arrendado: true, availability: 'maintenance' })]
    const cuenta = contarPorCajon(filas)
    expect(cuenta.arrendado + cuenta.mantenimiento).toBe(1)
  })

  it('sin contrato, el mandato decide', () => {
    expect(cajonDelInmueble(mandato({ arrendado: false, availability: 'in_process' }))).toBe(
      'enProceso',
    )
    expect(cajonDelInmueble(mandato({ arrendado: false, availability: 'maintenance' }))).toBe(
      'mantenimiento',
    )
    expect(cajonDelInmueble(mandato({ arrendado: false, availability: 'available' }))).toBe(
      'disponible',
    )
  })

  it('el back manda MAYÚSCULAS y eso no puede cambiar el cajón', () => {
    // `GET /inmobiliaria/consignaciones` devuelve 'RENTED', no 'rented'.
    expect(
      cajonDelInmueble(mandato({ availability: 'RENTED' as Consignacion['availability'] })),
    ).toBe('arrendado')
    expect(
      cajonDelInmueble(mandato({ availability: 'MAINTENANCE' as Consignacion['availability'] })),
    ).toBe('mantenimiento')
  })

  it('un `availability` que nadie conoce cae en un cajón VISIBLE, no en el vacío', () => {
    // «Disponible» es el complemento, no un valor: así la suma no se rompe
    // el día que el back agregue un estado nuevo.
    expect(
      cajonDelInmueble(mandato({ availability: 'reserved' as Consignacion['availability'] })),
    ).toBe('disponible')
  })

  it('sin el campo `arrendado` se cae a la disponibilidad, no a cero', () => {
    expect(estaArrendado({ availability: 'rented' } as Consignacion)).toBe(true)
    expect(estaArrendado({ availability: 'available' } as Consignacion)).toBe(false)
  })

  it('🔴 LOS CINCO CAJONES SUMAN EL TOTAL, siempre', () => {
    const filas: PortafolioRow[] = [
      ...Array.from({ length: 104 }, (_, i) =>
        mandato({ id: `r${i}`, arrendado: true, availability: 'RENTED' as Consignacion['availability'] }),
      ),
      mandato({ id: 'm1', arrendado: true, availability: 'MAINTENANCE' as Consignacion['availability'] }),
      ...Array.from({ length: 3 }, (_, i) =>
        mandato({ id: `d${i}`, arrendado: false, availability: 'AVAILABLE' as Consignacion['availability'] }),
      ),
      ...Array.from({ length: 25 }, () => SIN_MANDATO),
    ]
    const cuenta = contarPorCajon(filas)
    // Los números reales de la agencia de QA, vistos en el navegador.
    expect(filas).toHaveLength(133)
    expect(cuenta).toEqual({
      disponible: 3,
      arrendado: 105,
      enProceso: 0,
      mantenimiento: 0,
      sinMandato: 25,
    })
    const suma = CAJONES_DEL_INMUEBLE.reduce((s, c) => s + cuenta[c], 0)
    expect(suma).toBe(filas.length)
  })
})
