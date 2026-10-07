import { describe, it, expect, beforeEach } from 'vitest'
import {
  anotarQueContinua,
  olvidarQueContinuo,
  volvioJustoDespuesDeContinuar,
  VENTANA_DEL_REBOTE_MS,
} from './regreso-tras-continuar'

beforeEach(() => {
  sessionStorage.clear()
})

describe('regreso-tras-continuar (LOGIN-BUCLE)', () => {
  it('sin haber continuado no hay rebote', () => {
    expect(volvioJustoDespuesDeContinuar()).toBe(false)
  })

  it('justo después de continuar, sí', () => {
    anotarQueContinua('/panel/inmobiliaria')
    expect(volvioJustoDespuesDeContinuar()).toBe(true)
  })

  it('pasada la ventana ya no cuenta como rebote', () => {
    anotarQueContinua('/panel/inmobiliaria')
    expect(volvioJustoDespuesDeContinuar(Date.now() + VENTANA_DEL_REBOTE_MS + 1)).toBe(false)
  })

  it('leer no la borra; olvidar sí (la borra quien la muestra, o el destino que abrió bien)', () => {
    anotarQueContinua('/panel/inmobiliaria')
    expect(volvioJustoDespuesDeContinuar()).toBe(true)
    expect(volvioJustoDespuesDeContinuar()).toBe(true)
    olvidarQueContinuo()
    expect(volvioJustoDespuesDeContinuar()).toBe(false)
  })

  it('una marca rota no se lee como rebote', () => {
    sessionStorage.setItem('leasefy:auth:continuo', '{no es json')
    expect(volvioJustoDespuesDeContinuar()).toBe(false)
  })
})
