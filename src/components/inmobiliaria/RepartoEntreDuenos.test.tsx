/**
 * El reparto entre dueños suma 100 % por construcción: el primero se lleva el
 * resto, los demás su casilla. Partes iguales para tres es 33,33 / 33,33 y
 * 33,34 para el principal — nunca 99,99.
 */
import { describe, it, expect } from 'vitest'
import { repartoEnPartesIguales } from './RepartoEntreDuenos'
import { bpsDelPrincipal, aListaDelCable } from './CopropietariosField'

describe('repartoEnPartesIguales', () => {
  it('con un solo dueño no hay reparto', () => {
    expect(repartoEnPartesIguales(['a'])).toEqual([])
  })

  it('dos dueños: 50 y 50', () => {
    const filas = repartoEnPartesIguales(['a', 'b'])
    expect(filas).toEqual([{ propietarioId: 'b', participacionBps: 5000 }])
    expect(bpsDelPrincipal(filas)).toBe(5000)
  })

  it('tres dueños: el principal carga el redondeo y la lista del cable suma 10000', () => {
    const filas = repartoEnPartesIguales(['a', 'b', 'c'])
    expect(filas.map((f) => f.participacionBps)).toEqual([3333, 3333])
    expect(bpsDelPrincipal(filas)).toBe(3334)
    const cable = aListaDelCable(filas, 'a')!
    expect(cable.reduce((acc, f) => acc + f.participacionBps, 0)).toBe(10000)
    expect(cable[0]).toEqual({ propietarioId: 'a', participacionBps: 3334 })
  })
})
