/**
 * Lo que se protege acá es la diferencia entre **deber** y **estar en mora**.
 *
 * El back mete en el mismo balde un cobro que todavía no vence y uno con 29
 * días de atraso, porque agrupa por `daysLate <= 30` y `daysLate` es 0 para lo
 * que no venció. Sumar las dos cosas da una mora inflada todos los meses — y
 * una alerta que salta siempre enseña a ignorarla.
 */

import { describe, expect, it } from 'vitest'

import type { CarteraItem } from '@/lib/types/inmobiliaria'
import {
  coincide,
  discriminar,
  edadDe,
  filtrarCartera,
  filtrarPropietarios,
  hayFiltrosDeCartera,
  porPropietario,
} from './edades'

function deuda(over: Partial<CarteraItem> = {}): CarteraItem {
  return {
    cobroId: 'c-1',
    consignacionId: 'cons-1',
    propertyTitle: 'Apto 301',
    propertyAddress: 'Cra 13 # 55-20',
    tenantName: 'Ana Pérez',
    tenantPhone: '3001234567',
    propietarioId: 'po-1',
    propietarioName: 'Jorge Restrepo',
    agenteId: null,
    agenteName: null,
    month: '2026-08',
    dueDate: '2026-08-05',
    totalAmount: 2_000_000,
    paidAmount: 0,
    pendingAmount: 2_000_000,
    daysLate: 0,
    status: 'COBRO_PENDING',
    remindersSent: 0,
    lastReminderDate: null,
    ...over,
  }
}

describe('la edad de una deuda', () => {
  it('lo que todavía no venció NO es mora', () => {
    expect(edadDe(deuda({ daysLate: 0 }))).toBe('por_vencer')
  })

  it('un día de atraso ya es mora', () => {
    expect(edadDe(deuda({ daysLate: 1 }))).toBe('1-30')
  })

  it('los bordes caen del lado correcto', () => {
    expect(edadDe(deuda({ daysLate: 30 }))).toBe('1-30')
    expect(edadDe(deuda({ daysLate: 31 }))).toBe('31-60')
    expect(edadDe(deuda({ daysLate: 60 }))).toBe('31-60')
    expect(edadDe(deuda({ daysLate: 61 }))).toBe('61-90')
    expect(edadDe(deuda({ daysLate: 90 }))).toBe('61-90')
    expect(edadDe(deuda({ daysLate: 91 }))).toBe('90+')
  })
})

describe('discriminar la cartera', () => {
  it('no cuenta como mora lo que aún no vence', () => {
    const r = discriminar([
      deuda({ cobroId: 'a', daysLate: 0, pendingAmount: 3_000_000 }),
      deuda({ cobroId: 'b', daysLate: 10, pendingAmount: 1_000_000 }),
    ])

    // El back habría dicho: bucket0to30 = 4.000.000, o sea 4 millones de mora
    // donde hay 1.
    expect(r.porVencer).toBe(3_000_000)
    expect(r.enMora).toBe(1_000_000)
    expect(r.deudasEnMora).toBe(1)
    expect(r.total).toBe(4_000_000)
  })

  it('reparte cada deuda en un solo tramo', () => {
    const r = discriminar([
      deuda({ cobroId: 'a', daysLate: 5, pendingAmount: 100 }),
      deuda({ cobroId: 'b', daysLate: 45, pendingAmount: 200 }),
      deuda({ cobroId: 'c', daysLate: 75, pendingAmount: 300 }),
      deuda({ cobroId: 'd', daysLate: 200, pendingAmount: 400 }),
    ])

    expect(r.tramos.map((t) => t.monto)).toEqual([0, 100, 200, 300, 400])
    // Los tramos suman el total: si no, la pantalla mostraría plata que no
    // aparece en ninguna fila.
    expect(r.tramos.reduce((s, t) => s + t.monto, 0)).toBe(r.total)
  })

  it('sin deudas todo es cero, no vacío', () => {
    const r = discriminar([])
    expect(r.total).toBe(0)
    expect(r.tramos).toHaveLength(5)
    expect(r.deudasEnMora).toBe(0)
  })
})

describe('por propietario', () => {
  it('agrupa y ordena por lo que se le debe', () => {
    const r = porPropietario([
      deuda({ propietarioId: 'a', propietarioName: 'Ana', pendingAmount: 100 }),
      deuda({ propietarioId: 'b', propietarioName: 'Beto', pendingAmount: 500 }),
      deuda({ propietarioId: 'a', propietarioName: 'Ana', pendingAmount: 100 }),
    ])

    expect(r[0].propietarioName).toBe('Beto')
    expect(r[1].monto).toBe(200)
    expect(r[1].deudas).toBe(2)
  })

  it('se queda con la PEOR edad del propietario, no la última', () => {
    const r = porPropietario([
      deuda({ propietarioId: 'a', daysLate: 200 }),
      deuda({ propietarioId: 'a', daysLate: 2 }),
    ])
    // Si tomara la última, un propietario con una deuda de 200 días se vería
    // como mora temprana.
    expect(r[0].peorEdad).toBe('90+')
  })

  it('una deuda sin propietario se nombra, no se esconde', () => {
    const r = porPropietario([
      deuda({ propietarioId: null, propietarioName: null, pendingAmount: 700 }),
    ])
    // Esconderla haría que la suma por propietario no cuadre con el total de
    // la cartera y nadie sepa por qué.
    expect(r).toHaveLength(1)
    expect(r[0].propietarioName).toBe('Sin propietario registrado')
    expect(r[0].monto).toBe(700)
  })
})

describe('inmuebles por propietario', () => {
  it('cuenta inmuebles DISTINTOS: cuatro cobros de un mismo apto son un inmueble', () => {
    const r = porPropietario([
      deuda({ cobroId: '1', propietarioId: 'a', consignacionId: 'apto-1' }),
      deuda({ cobroId: '2', propietarioId: 'a', consignacionId: 'apto-1' }),
      deuda({ cobroId: '3', propietarioId: 'a', consignacionId: 'apto-2' }),
    ])
    expect(r[0].deudas).toBe(3)
    expect(r[0].inmuebles).toBe(2)
  })
})

describe('los filtros de la cartera', () => {
  const marta = deuda({ cobroId: 'm1', propietarioId: 'p1', propietarioName: 'Marta', tenantName: 'Esteban', daysLate: 12 })
  const marta2 = deuda({ cobroId: 'm2', propietarioId: 'p1', propietarioName: 'Marta', tenantName: 'Ana', daysLate: 95 })
  const jorge = deuda({ cobroId: 'j1', propietarioId: 'p2', propietarioName: 'Jorge', tenantName: 'Luis', daysLate: 0 })
  const nadie = deuda({ cobroId: 'n1', propietarioId: null, propietarioName: null, tenantName: 'Carla', daysLate: 40 })
  const todas = [marta, marta2, jorge, nadie]

  it('sin filtro devuelve todo', () => {
    expect(filtrarCartera(todas, {})).toHaveLength(4)
    expect(hayFiltrosDeCartera({})).toBe(false)
    expect(hayFiltrosDeCartera({ busqueda: '   ' })).toBe(false)
  })

  it('el tramo filtra por edad', () => {
    expect(filtrarCartera(todas, { edad: '90+' }).map((i) => i.cobroId)).toEqual(['m2'])
    expect(filtrarCartera(todas, { edad: 'por_vencer' }).map((i) => i.cobroId)).toEqual(['j1'])
    expect(hayFiltrosDeCartera({ edad: '1-30' })).toBe(true)
  })

  it('la búsqueda mira inquilino, inmueble y propietario, sin distinguir mayúsculas', () => {
    expect(filtrarCartera(todas, { busqueda: 'MARTA' }).map((i) => i.cobroId)).toEqual(['m1', 'm2'])
    expect(filtrarCartera(todas, { busqueda: 'carla' }).map((i) => i.cobroId)).toEqual(['n1'])
    expect(filtrarCartera(todas, { busqueda: 'Cra 13' })).toHaveLength(4)
    expect(coincide([null, undefined, 'Apto'], 'apto')).toBe(true)
    expect(coincide([null], 'x')).toBe(false)
  })

  it('el propietario: un id abre SUS deudas; null abre las que no tienen propietario', () => {
    expect(filtrarCartera(todas, { propietarioId: 'p1' }).map((i) => i.cobroId)).toEqual(['m1', 'm2'])
    // `null` no es «sin filtro»: es la fila «Sin propietario registrado».
    expect(filtrarCartera(todas, { propietarioId: null }).map((i) => i.cobroId)).toEqual(['n1'])
    expect(hayFiltrosDeCartera({ propietarioId: null })).toBe(true)
    expect(hayFiltrosDeCartera({ propietarioId: undefined })).toBe(false)
  })

  it('los filtros se combinan', () => {
    expect(filtrarCartera(todas, { edad: '1-30', propietarioId: 'p1', busqueda: 'esteban' })).toHaveLength(1)
    expect(filtrarCartera(todas, { edad: '90+', busqueda: 'esteban' })).toHaveLength(0)
  })

  it('no muta la lista que recibe', () => {
    const copia = [...todas]
    filtrarCartera(todas, { edad: '90+' })
    expect(todas).toEqual(copia)
  })

  it('por propietario se busca por el nombre del propietario', () => {
    const grupos = porPropietario(todas)
    expect(filtrarPropietarios(grupos, 'mar').map((p) => p.propietarioName)).toEqual(['Marta'])
    expect(filtrarPropietarios(grupos, 'sin propietario')).toHaveLength(1)
    expect(filtrarPropietarios(grupos, '')).toHaveLength(3)
  })
})
