/**
 * Lo que se protege acá es la diferencia entre **deber**, **haber vencido** y
 * **estar en cartera** — tres cosas que esta pantalla mezclaba en una.
 *
 * Antes el front hacía la separación a mano porque el back agrupaba todo lo
 * pendiente por `daysLate <= 30`. Hoy el back sale de `contrato_cuotas` y
 * manda el cajón resuelto con los días de plazo del contrato adentro, así que
 * acá sólo se AGRUPA — y lo que hay que fijar es que agrupar no vuelva a
 * juntar lo que el back separó.
 */

import { describe, expect, it } from 'vitest'

import type { CarteraItem } from '@/lib/types/inmobiliaria'
import {
  coincide,
  discriminar,
  edadDe,
  filtrarCartera,
  filtrarPropietarios,
  gravedadDe,
  hayFiltrosDeCartera,
  porPropietario,
} from './edades'

function deuda(over: Partial<CarteraItem> = {}): CarteraItem {
  return {
    cuotaId: 'q-1',
    cobroId: null,
    contractId: 'ct-1',
    contrato: '1686',
    contratoDeLeasefy: 'Leasefy #12',
    propertyId: 'inm-1',
    consignacionId: 'cons-1',
    propertyTitle: 'Apto 301',
    propertyAddress: 'Cra 13 # 55-20',
    tenantName: 'Ana Pérez',
    tenantPhone: '3001234567',
    tenantDocument: '1020',
    propietarioId: 'po-1',
    propietarioName: 'Jorge Restrepo',
    agenteId: null,
    agenteName: null,
    month: '2026-08',
    vence: '2026-08-05',
    estado: 'PENDIENTE',
    cajon: 'CARTERA',
    diasDeMora: 0,
    diasDePlazo: 3,
    esVencida: true,
    totalAmount: 2_000_000,
    paidAmount: 0,
    pendingAmount: 2_000_000,
    remindersSent: null,
    lastReminderDate: null,
    ...over,
  }
}

/** Atajos para los dos cajones que NO son cartera. */
const porVencer = (over: Partial<CarteraItem> = {}) =>
  deuda({ cajon: 'POR_VENCER', esVencida: false, diasDeMora: 0, ...over })
const enPlazo = (over: Partial<CarteraItem> = {}) =>
  deuda({ cajon: 'VENCIDA_EN_PLAZO', esVencida: true, diasDeMora: 0, ...over })

describe('la edad de una deuda', () => {
  it('🔴 lo que no es cartera NO tiene edad de mora', () => {
    // Ponerle «0-30» a una deuda futura la metería en la lista de a quién
    // llamar, que es exactamente lo que la Ley 2300 castiga.
    expect(edadDe(porVencer())).toBeNull()
    expect(edadDe(enPlazo())).toBeNull()
  })

  it('los bordes caen del lado correcto, sobre la mora REAL', () => {
    expect(edadDe(deuda({ diasDeMora: 1 }))).toBe('0-30')
    expect(edadDe(deuda({ diasDeMora: 30 }))).toBe('0-30')
    expect(edadDe(deuda({ diasDeMora: 31 }))).toBe('31-60')
    expect(edadDe(deuda({ diasDeMora: 60 }))).toBe('31-60')
    expect(edadDe(deuda({ diasDeMora: 61 }))).toBe('61-90')
    expect(edadDe(deuda({ diasDeMora: 90 }))).toBe('61-90')
    expect(edadDe(deuda({ diasDeMora: 91 }))).toBe('90+')
  })

  it('la gravedad pone cajón y edad en una sola escala', () => {
    expect(gravedadDe(porVencer())).toBe('POR_VENCER')
    expect(gravedadDe(enPlazo())).toBe('VENCIDA_EN_PLAZO')
    expect(gravedadDe(deuda({ diasDeMora: 95 }))).toBe('90+')
  })
})

describe('discriminar la cartera', () => {
  it('🔴 no cuenta como cartera lo que aún no vence ni lo vencido en plazo', () => {
    const r = discriminar([
      porVencer({ cuotaId: 'a', pendingAmount: 3_000_000 }),
      enPlazo({ cuotaId: 'b', pendingAmount: 500_000 }),
      deuda({ cuotaId: 'c', diasDeMora: 10, pendingAmount: 1_000_000 }),
    ])

    const monto = (cajon: string) => r.cajones.find((c) => c.cajon === cajon)!.monto
    expect(monto('POR_VENCER')).toBe(3_000_000)
    expect(monto('VENCIDA_EN_PLAZO')).toBe(500_000)
    expect(monto('CARTERA')).toBe(1_000_000)
    // La deuda entera sigue estando: no se pierde, se separa.
    expect(r.deudaTotal).toBe(4_500_000)
  })

  it('los cajones son una partición: suman la deuda total', () => {
    const r = discriminar([
      porVencer({ cuotaId: 'a', pendingAmount: 100 }),
      enPlazo({ cuotaId: 'b', pendingAmount: 200 }),
      deuda({ cuotaId: 'c', diasDeMora: 5, pendingAmount: 300 }),
    ])
    expect(r.cajones.reduce((s, c) => s + c.monto, 0)).toBe(r.deudaTotal)
  })

  it('reparte cada deuda en un solo tramo, y los tramos son SÓLO de cartera', () => {
    const r = discriminar([
      porVencer({ cuotaId: 'z', pendingAmount: 9_999 }),
      deuda({ cuotaId: 'a', diasDeMora: 5, pendingAmount: 100 }),
      deuda({ cuotaId: 'b', diasDeMora: 45, pendingAmount: 200 }),
      deuda({ cuotaId: 'c', diasDeMora: 75, pendingAmount: 300 }),
      deuda({ cuotaId: 'd', diasDeMora: 200, pendingAmount: 400 }),
    ])

    expect(r.tramos.map((t) => t.monto)).toEqual([100, 200, 300, 400])
    // Los tramos suman la CARTERA, no la deuda: si sumaran la deuda, la
    // pantalla mandaría a cobrar plata que nadie debe todavía.
    const cartera = r.cajones.find((c) => c.cajon === 'CARTERA')!.monto
    expect(r.tramos.reduce((s, t) => s + t.monto, 0)).toBe(cartera)
  })

  it('sin deudas todo es cero, no vacío', () => {
    const r = discriminar([])
    expect(r.deudaTotal).toBe(0)
    expect(r.tramos).toHaveLength(4)
    expect(r.cajones).toHaveLength(3)
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

  it('se queda con lo PEOR del propietario, no con lo último', () => {
    const r = porPropietario([
      deuda({ propietarioId: 'a', diasDeMora: 200 }),
      deuda({ propietarioId: 'a', diasDeMora: 2 }),
    ])
    // Si tomara la última, un propietario con una deuda de 200 días se vería
    // como mora temprana.
    expect(r[0].peor).toBe('90+')
  })

  it('«vencido en plazo» es peor que «por vencer», y cartera peor que las dos', () => {
    const soloFuturo = porPropietario([porVencer({ propietarioId: 'a' })])
    expect(soloFuturo[0].peor).toBe('POR_VENCER')

    const conVencida = porPropietario([
      porVencer({ cuotaId: '1', propietarioId: 'a' }),
      enPlazo({ cuotaId: '2', propietarioId: 'a' }),
    ])
    expect(conVencida[0].peor).toBe('VENCIDA_EN_PLAZO')

    const conCartera = porPropietario([
      enPlazo({ cuotaId: '1', propietarioId: 'a' }),
      deuda({ cuotaId: '2', propietarioId: 'a', diasDeMora: 4 }),
    ])
    expect(conCartera[0].peor).toBe('0-30')
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
  it('cuenta inmuebles DISTINTOS: cuatro cuotas de un mismo apto son un inmueble', () => {
    const r = porPropietario([
      deuda({ cuotaId: '1', propietarioId: 'a', propertyId: 'apto-1' }),
      deuda({ cuotaId: '2', propietarioId: 'a', propertyId: 'apto-1' }),
      deuda({ cuotaId: '3', propietarioId: 'a', propertyId: 'apto-2' }),
    ])
    expect(r[0].deudas).toBe(3)
    expect(r[0].inmuebles).toBe(2)
  })

  it('dos contratos migrados SIN inmueble son dos inmuebles, no uno', () => {
    // Fundirlos bajo un mismo `null` haría que dos apartamentos distintos se
    // contaran como uno solo.
    const r = porPropietario([
      deuda({ cuotaId: '1', propietarioId: 'a', propertyId: null, contractId: 'ct-1' }),
      deuda({ cuotaId: '2', propietarioId: 'a', propertyId: null, contractId: 'ct-2' }),
    ])
    expect(r[0].inmuebles).toBe(2)
  })
})

describe('los filtros de la cartera', () => {
  const marta = deuda({ cuotaId: 'm1', propietarioId: 'p1', propietarioName: 'Marta', tenantName: 'Esteban', diasDeMora: 12 })
  const marta2 = deuda({ cuotaId: 'm2', propietarioId: 'p1', propietarioName: 'Marta', tenantName: 'Ana', diasDeMora: 95 })
  const jorge = porVencer({ cuotaId: 'j1', propietarioId: 'p2', propietarioName: 'Jorge', tenantName: 'Luis' })
  const nadie = deuda({ cuotaId: 'n1', propietarioId: null, propietarioName: null, tenantName: 'Carla', diasDeMora: 40 })
  const enGracia = enPlazo({ cuotaId: 'g1', propietarioId: 'p2', propietarioName: 'Jorge', tenantName: 'Sara' })
  const todas = [marta, marta2, jorge, nadie, enGracia]

  it('sin filtro devuelve todo', () => {
    expect(filtrarCartera(todas, {})).toHaveLength(5)
    expect(hayFiltrosDeCartera({})).toBe(false)
    expect(hayFiltrosDeCartera({ busqueda: '   ' })).toBe(false)
  })

  it('el cajón filtra por estado de la deuda', () => {
    expect(filtrarCartera(todas, { cajon: 'POR_VENCER' }).map((i) => i.cuotaId)).toEqual(['j1'])
    expect(filtrarCartera(todas, { cajon: 'VENCIDA_EN_PLAZO' }).map((i) => i.cuotaId)).toEqual(['g1'])
    expect(filtrarCartera(todas, { cajon: 'CARTERA' }).map((i) => i.cuotaId)).toEqual([
      'm1',
      'm2',
      'n1',
    ])
    expect(hayFiltrosDeCartera({ cajon: 'CARTERA' })).toBe(true)
  })

  it('el tramo filtra por edad, y nunca alcanza lo que no es cartera', () => {
    expect(filtrarCartera(todas, { edad: '90+' }).map((i) => i.cuotaId)).toEqual(['m2'])
    expect(filtrarCartera(todas, { edad: '0-30' }).map((i) => i.cuotaId)).toEqual(['m1'])
    expect(hayFiltrosDeCartera({ edad: '0-30' })).toBe(true)
  })

  it('la búsqueda mira inquilino, inmueble, propietario y contrato, sin distinguir mayúsculas', () => {
    expect(filtrarCartera(todas, { busqueda: 'MARTA' }).map((i) => i.cuotaId)).toEqual(['m1', 'm2'])
    expect(filtrarCartera(todas, { busqueda: 'carla' }).map((i) => i.cuotaId)).toEqual(['n1'])
    expect(filtrarCartera(todas, { busqueda: '1686' })).toHaveLength(5)
    expect(filtrarCartera(todas, { busqueda: 'Cra 13' })).toHaveLength(5)
    expect(coincide([null, undefined, 'Apto'], 'apto')).toBe(true)
    expect(coincide([null], 'x')).toBe(false)
  })

  it('el propietario: un id abre SUS deudas; null abre las que no tienen propietario', () => {
    expect(filtrarCartera(todas, { propietarioId: 'p1' }).map((i) => i.cuotaId)).toEqual(['m1', 'm2'])
    // `null` no es «sin filtro»: es la fila «Sin propietario registrado».
    expect(filtrarCartera(todas, { propietarioId: null }).map((i) => i.cuotaId)).toEqual(['n1'])
    expect(hayFiltrosDeCartera({ propietarioId: null })).toBe(true)
    expect(hayFiltrosDeCartera({ propietarioId: undefined })).toBe(false)
  })

  it('los filtros se combinan', () => {
    expect(
      filtrarCartera(todas, { edad: '0-30', propietarioId: 'p1', busqueda: 'esteban' }),
    ).toHaveLength(1)
    expect(filtrarCartera(todas, { edad: '90+', busqueda: 'esteban' })).toHaveLength(0)
    expect(filtrarCartera(todas, { cajon: 'CARTERA', busqueda: 'luis' })).toHaveLength(0)
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
