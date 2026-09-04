import { describe, it, expect } from 'vitest'
import type { RentabilidadFila } from '@/lib/types/inmobiliaria'
import { alternarOrden, ordenarFilas } from './rentabilidad-orden'

function fila(o: Partial<RentabilidadFila>): RentabilidadFila {
  return {
    consignacionId: 'c',
    propertyId: null,
    codigo: null,
    propertyTitle: 'x',
    propertyAddress: '',
    propertyCity: '',
    propertyZone: null,
    propietarioId: 'p',
    propietarioNombre: '',
    canonCop: 0,
    canonDesconocido: false,
    mesesEnRango: 1,
    mesesConCobro: 1,
    esperadoCop: 0,
    recaudadoCop: 0,
    pendienteCop: 0,
    enMoraCop: 0,
    tasaDeRecaudoPct: 0,
    comisionCop: 0,
    retencionesYCargosCop: 0,
    gastosMantenimientoCop: 0,
    netoPropietarioCop: 0,
    margenNetoPct: 0,
    ocupacionPct: 0,
    ocupacionFuente: 'leases',
    diasEnRango: 30,
    diasVacantes: 0,
    ingresoPerdidoPorVacanciaCop: 0,
    valorInmuebleCop: null,
    rentabilidadBrutaAnualPct: null,
    rentabilidadNetaAnualPct: null,
    estado: 'ACTIVE',
    availability: 'RENTED',
    ...o,
  }
}

describe('ordenarFilas', () => {
  it('ordena números en las dos direcciones sin mutar la entrada', () => {
    const filas = [fila({ consignacionId: 'a', netoPropietarioCop: 10 }), fila({ consignacionId: 'b', netoPropietarioCop: 30 })]
    expect(ordenarFilas(filas, { columna: 'neto', direccion: 'desc' }).map((f) => f.consignacionId)).toEqual(['b', 'a'])
    expect(ordenarFilas(filas, { columna: 'neto', direccion: 'asc' }).map((f) => f.consignacionId)).toEqual(['a', 'b'])
    expect(filas[0].consignacionId).toBe('a')
  })

  it('los «sin valor comercial» van al final en cualquier dirección', () => {
    const filas = [
      fila({ consignacionId: 'sin', rentabilidadNetaAnualPct: null }),
      fila({ consignacionId: 'bajo', rentabilidadNetaAnualPct: 2 }),
      fila({ consignacionId: 'alto', rentabilidadNetaAnualPct: 8 }),
    ]
    expect(ordenarFilas(filas, { columna: 'rentabilidad', direccion: 'desc' }).map((f) => f.consignacionId)).toEqual(['alto', 'bajo', 'sin'])
    expect(ordenarFilas(filas, { columna: 'rentabilidad', direccion: 'asc' }).map((f) => f.consignacionId)).toEqual(['bajo', 'alto', 'sin'])
  })

  it('el canon desconocido también va al final', () => {
    const filas = [fila({ consignacionId: '?', canonDesconocido: true, canonCop: 0 }), fila({ consignacionId: 'ok', canonCop: 100 })]
    expect(ordenarFilas(filas, { columna: 'canon', direccion: 'asc' }).map((f) => f.consignacionId)).toEqual(['ok', '?'])
  })

  it('el inmueble se ordena por título, con acentos', () => {
    const filas = [fila({ consignacionId: 'z', propertyTitle: 'Zapote' }), fila({ consignacionId: 'a', propertyTitle: 'Ábaco' })]
    expect(ordenarFilas(filas, { columna: 'inmueble', direccion: 'asc' }).map((f) => f.consignacionId)).toEqual(['a', 'z'])
  })
})

describe('alternarOrden', () => {
  it('la misma columna alterna; otra arranca en su orden natural', () => {
    expect(alternarOrden({ columna: 'neto', direccion: 'desc' }, 'neto')).toEqual({ columna: 'neto', direccion: 'asc' })
    expect(alternarOrden({ columna: 'neto', direccion: 'desc' }, 'canon')).toEqual({ columna: 'canon', direccion: 'desc' })
    expect(alternarOrden({ columna: 'neto', direccion: 'desc' }, 'inmueble')).toEqual({ columna: 'inmueble', direccion: 'asc' })
  })
})
