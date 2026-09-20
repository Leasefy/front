import { describe, expect, it } from 'vitest'

import type { InquilinoEnCartera, PropietarioEnCartera } from '@/lib/api/cartera.types'
import {
  cuadra,
  filtrarInquilinos,
  filtrarPropietarios,
  haySinDesglose,
  saldoDe,
  saldoReconstruido,
  sumarTotales,
} from './conceptos'

function inquilino(p: Partial<InquilinoEnCartera>): InquilinoEnCartera {
  return {
    clave: 'k',
    nombre: 'Nicolás Rojas',
    documento: '70814637',
    telefono: null,
    contratos: [{ contractId: 'c', contrato: '1686', inmueble: 'Apartamento 302' }],
    filas: [],
    totales: {
      porConcepto: {},
      saldoPorConcepto: {},
      facturadoCop: 0,
      sinDesgloseCop: 0,
      abonadoCop: 0,
      saldoCop: 1,
      enMoraCop: 0,
      vencidaEnPlazoCop: 0,
      porVencerCop: 1,
      enSiniestroCop: 0,
      cuotas: 1,
      cobros: 1,
    },
    ...p,
  }
}

describe('conceptos de la cartera', () => {
  it('un concepto que no aparece en la fila se debe en cero', () => {
    expect(saldoDe({ CANON: 5 }, 'CANON')).toBe(5)
    expect(saldoDe({ CANON: 5 }, 'IVA')).toBe(0)
  })

  it('la columna «sin desglose» sólo existe si alguna fila la trae', () => {
    const fila = { sinDesgloseCop: 0 } as never
    expect(haySinDesglose([fila])).toBe(false)
    expect(haySinDesglose([fila, { sinDesgloseCop: -3202 } as never])).toBe(true)
  })

  it('busca por nombre, documento, contrato o inmueble, sin tildes ni mayúsculas', () => {
    const lista = [
      inquilino({ clave: 'a' }),
      inquilino({
        clave: 'b',
        nombre: 'Marta Gómez',
        documento: '43111222',
        contratos: [{ contractId: 'd', contrato: '#94', inmueble: 'Casa en Laureles' }],
      }),
    ]
    expect(filtrarInquilinos(lista, 'nicolas', false).map((i) => i.clave)).toEqual(['a'])
    expect(filtrarInquilinos(lista, '43111', false).map((i) => i.clave)).toEqual(['b'])
    expect(filtrarInquilinos(lista, '#94', false).map((i) => i.clave)).toEqual(['b'])
    expect(filtrarInquilinos(lista, 'LAURELES', false).map((i) => i.clave)).toEqual(['b'])
    expect(filtrarInquilinos(lista, '', false)).toHaveLength(2)
  })

  it('«sólo cartera» deja afuera a quien sólo tiene cuotas por vencer', () => {
    const lista = [
      inquilino({ clave: 'a' }),
      inquilino({
        clave: 'b',
        totales: { ...inquilino({}).totales, enMoraCop: 100, porVencerCop: 0 },
      }),
    ]
    expect(filtrarInquilinos(lista, '', true).map((i) => i.clave)).toEqual(['b'])
  })

  it('las columnas de una fila tienen que explicar su saldo', () => {
    expect(saldoReconstruido({ CANON: 2_100_000, INTERES_DE_MORA: 9_800 })).toBe(2_109_800)
    expect(cuadra({ saldoPorConcepto: { CANON: 100, IVA: 19 }, saldoCop: 119 })).toBe(true)
    // El cobro real de QA: la línea de interés escrita dos veces.
    expect(
      cuadra({
        saldoPorConcepto: { CANON: 2_400_000, INTERES_DE_MORA: 6_404 },
        saldoCop: 2_403_202,
      }),
    ).toBe(false)
  })

  it('el pie suma lo que se ve, concepto por concepto', () => {
    const uno = inquilino({
      clave: 'a',
      totales: {
        ...inquilino({}).totales,
        porConcepto: { CANON: 100, INTERES_DE_MORA: 5 },
        saldoPorConcepto: { CANON: 100, INTERES_DE_MORA: 5 },
        facturadoCop: 105,
        abonadoCop: 0,
        saldoCop: 105,
        enMoraCop: 100,
        vencidaEnPlazoCop: 5,
        porVencerCop: 0,
        cuotas: 1,
        cobros: 1,
      },
    })
    const otro = inquilino({
      clave: 'b',
      totales: {
        ...inquilino({}).totales,
        porConcepto: { CANON: 50, GASTO_ADMINISTRATIVO: 7 },
        saldoPorConcepto: { CANON: 50, GASTO_ADMINISTRATIVO: 7 },
        facturadoCop: 57,
        abonadoCop: 0,
        saldoCop: 57,
        enMoraCop: 0,
        vencidaEnPlazoCop: 0,
        porVencerCop: 57,
        cuotas: 2,
        cobros: 2,
      },
    })
    const total = sumarTotales([uno, otro])
    expect(total.saldoPorConcepto).toEqual({ CANON: 150, INTERES_DE_MORA: 5, GASTO_ADMINISTRATIVO: 7 })
    expect(total.saldoCop).toBe(162)
    expect(saldoReconstruido(total.saldoPorConcepto)).toBe(total.saldoCop)
    /*
     * 🔴 Los TRES cajones son una partición y tienen que cerrar contra el saldo.
     * Con dos —el invariante viejo— una cartera con algo vencido dentro del
     * plazo no cuadraba, y la diferencia se iba a parar a la cifra equivocada.
     */
    expect(total.enMoraCop + total.vencidaEnPlazoCop + total.porVencerCop).toBe(total.saldoCop)
    expect(total.enMoraCop).toBe(100)
    expect(total.vencidaEnPlazoCop).toBe(5)
    expect(total.porVencerCop).toBe(57)
    expect(total.cuotas).toBe(3)
    // El alias deprecado sigue la misma cuenta mientras el front se renombra.
    expect(total.cobros).toBe(3)
    // Sin nadie en pantalla el pie es cero, no el total general.
    expect(sumarTotales([]).saldoCop).toBe(0)
  })

  it('los propietarios se buscan por nombre, sin tildes', () => {
    const lista = [
      { nombre: 'Marta Cifuentes' },
      { nombre: 'Jorge Restrepo' },
    ] as PropietarioEnCartera[]
    expect(filtrarPropietarios(lista, 'restrepo').map((p) => p.nombre)).toEqual(['Jorge Restrepo'])
    expect(filtrarPropietarios(lista, '')).toHaveLength(2)
  })
})
