import { beforeEach, describe, expect, it } from 'vitest'
import { cierrePropioEnCurso, limpiarCierrePropio, marcarCierrePropio } from './cierre-propio'

beforeEach(() => limpiarCierrePropio())

describe('cierre propio', () => {
  it('starts off', () => {
    expect(cierrePropioEnCurso()).toBe(false)
  })

  it('marcar turns it on and limpiar turns it off', () => {
    marcarCierrePropio()
    expect(cierrePropioEnCurso()).toBe(true)
    limpiarCierrePropio()
    expect(cierrePropioEnCurso()).toBe(false)
  })
})
