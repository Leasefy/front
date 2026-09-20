/**
 * La decisión de negocio del 15-09, fijada: un neto negativo NO es plata a
 * favor. Se pinta en rojo, se dice con la palabra «queda debiendo», y ninguna
 * suma lo cuenta como ingreso.
 */
import { describe, it, expect } from 'vitest'

import {
  netoDelPropietario,
  pesos,
  sumarLoQueSeGira,
} from './neto-del-propietario'

describe('netoDelPropietario', () => {
  it('un neto positivo se escribe y queda neutro (ni verde ni rojo)', () => {
    const n = netoDelPropietario(1_620_000)
    expect(n.quedaDebiendo).toBe(false)
    expect(n.texto).toBe('$1.620.000')
    expect(n.clase).toBe('text-fg')
    expect(n.explicacion).toBeNull()
  })

  it('🔴 un neto negativo NUNCA se pinta como plata a favor: rojo y «queda debiendo»', () => {
    const n = netoDelPropietario(-340_000)
    expect(n.quedaDebiendo).toBe(true)
    expect(n.texto).toBe('queda debiendo $340.000')
    // Ni verde, ni un «−$340.000» pelado entre columnas alineadas.
    expect(n.clase).toBe('text-danger')
    expect(n.texto).not.toContain('-')
    expect(n.clase).not.toContain('success')
    expect(n.explicacion).toContain('descontó más')
  })

  it('el cero es cero: no debe nada y no se anuncia como deuda', () => {
    expect(netoDelPropietario(0).quedaDebiendo).toBe(false)
    expect(netoDelPropietario(0).texto).toBe('$0')
  })

  it('acepta el formateador de la pantalla sin cambiar la regla', () => {
    const n = netoDelPropietario(-1_000, (v) => `COP ${v}`)
    expect(n.texto).toBe('queda debiendo COP 1000')
  })

  it('pesos redondea y agrupa a la colombiana', () => {
    expect(pesos(1234567.4)).toBe('$1.234.567')
  })
})

describe('sumarLoQueSeGira', () => {
  it('🔴 un negativo NO se resta del giro: son dos hechos distintos', () => {
    const r = sumarLoQueSeGira([1_000_000, 500_000, -300_000])
    expect(r.seGiraCop).toBe(1_500_000)
    expect(r.quedanDebiendoCop).toBe(300_000)
    expect(r.cuantosDeben).toBe(1)
    // El error que esto evita: informar «$1.200.000 a girar», que no es ni lo
    // que se gira ni lo que se debe.
    expect(r.seGiraCop).not.toBe(1_200_000)
  })

  it('sin negativos, lo que se gira es la suma entera', () => {
    const r = sumarLoQueSeGira([100, 200])
    expect(r).toEqual({ seGiraCop: 300, quedanDebiendoCop: 0, cuantosDeben: 0 })
  })

  it('una lista vacía no inventa nada', () => {
    expect(sumarLoQueSeGira([])).toEqual({
      seGiraCop: 0,
      quedanDebiendoCop: 0,
      cuantosDeben: 0,
    })
  })
})
