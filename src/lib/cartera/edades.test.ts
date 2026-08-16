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
import { discriminar, edadDe, porPropietario } from './edades'

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
