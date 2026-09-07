import { describe, it, expect } from 'vitest'
import {
  digitoDeVerificacion,
  revisarNit,
  BASE_PERSONA_JURIDICA,
} from './nit'

describe('digitoDeVerificacion', () => {
  // NITs públicos reales: si el algoritmo se rompe, estos tres lo gritan.
  it.each([
    ['890903938', 8, 'Bancolombia'],
    ['899999068', 1, 'Ecopetrol'],
    ['860002964', 4, 'Banco de Bogotá'],
  ])('%s → %i (%s)', (base, esperado) => {
    expect(digitoDeVerificacion(base as string)).toBe(esperado)
  })

  it('devuelve el residuo cuando es 0 o 1, no 11 menos el residuo', () => {
    // Ecopetrol cae en esa rama: sin ella daría 10, que no es un dígito.
    expect(digitoDeVerificacion('899999068')).toBeLessThan(10)
  })

  it('rechaza lo que no son dígitos en vez de calcular basura', () => {
    expect(() => digitoDeVerificacion('900-123')).toThrow()
    expect(() => digitoDeVerificacion('')).toThrow()
  })
})

describe('revisarNit', () => {
  it('acepta el NIT con su dígito y lo normaliza', () => {
    const r = revisarNit('890903938-8')
    expect(r).toMatchObject({ ok: true, base: '890903938', dv: 8, normalizado: '890903938-8' })
  })

  it('acepta el NIT con puntos, como viene impreso en el RUT', () => {
    const r = revisarNit('890.903.938-8')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.normalizado).toBe('890903938-8')
  })

  it('acepta el NIT sin dígito de verificación y lo calcula', () => {
    const r = revisarNit('890903938')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.dv).toBe(8)
      expect(r.normalizado).toBe('890903938-8')
      expect(r.traiaDv).toBe(false)
    }
  })

  it('lo devuelve con puntos para mostrarlo', () => {
    const r = revisarNit('890903938')
    if (r.ok) expect(r.bonito).toBe('890.903.938-8')
  })

  it('dice cuál es el dígito correcto cuando el escrito no cuadra', () => {
    const r = revisarNit('890903938-1')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.motivo).toBe('digito-de-verificacion')
      expect(r.mensaje).toContain('es 8')
    }
  })

  it('el ejemplo que traía el formulario estaba mal: 900123456 termina en 8', () => {
    const r = revisarNit('900123456-7')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.mensaje).toContain('es 8')
  })

  it.each([
    ['', 'vacio'],
    ['   ', 'vacio'],
    ['NIT 900123456', 'caracteres'],
    ['900-123-456', 'formato'],
    ['900123456-', 'formato'],
    ['900123456-88', 'formato'],
    ['012345678', 'arranca-en-cero'],
    ['12345', 'corto'],
    ['12345678901', 'largo'],
  ])('%s → %s', (entrada, motivo) => {
    const r = revisarNit(entrada as string)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toBe(motivo)
  })

  it('acepta la cédula de una persona natural, que es más corta que 9', () => {
    const r = revisarNit('79482553')
    expect(r.ok).toBe(true)
  })

  it('nombra los 9 dígitos de una empresa cuando la longitud no da', () => {
    const r = revisarNit('12345')
    if (!r.ok) expect(r.mensaje).toContain(String(BASE_PERSONA_JURIDICA))
  })

  it('aguanta el guion largo que llega al copiar y pegar', () => {
    const r = revisarNit('890903938–8')
    expect(r.ok).toBe(true)
  })

  it('nunca lanza, por más raro que venga', () => {
    for (const raro of ['---', '.-.', '9'.repeat(60), '🙂', '-8']) {
      expect(() => revisarNit(raro)).not.toThrow()
      expect(revisarNit(raro).ok).toBe(false)
    }
  })
})
