import { describe, it, expect } from 'vitest'
import {
  digitoDeVerificacion,
  formatearNitAlEscribir,
  revisarNit,
  BASE_MAXIMO,
  BASE_PERSONA_JURIDICA,
  LARGO_MAXIMO_AL_ESCRIBIR,
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

  it('acepta la cédula nueva de una persona natural: 10 dígitos más su dígito', () => {
    const r = revisarNit('1020304050')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.normalizado).toBe(`1020304050-${digitoDeVerificacion('1020304050')}`)
  })

  it('una cédula vieja de 8 dígitos NO pasa: el asistente del agente exige 9 o 10', () => {
    // Nico lo vio el 2026-09-07: con 8 dígitos el back creaba la agencia y el
    // agente respondía 400 → «Tu inmobiliaria quedó creada, pero no alcanzamos
    // a abrir el asistente», sin salida.
    const r = revisarNit('90000000-8')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toBe('corto')
  })

  it('nombra los 9 dígitos de una empresa cuando la longitud no da', () => {
    const r = revisarNit('12345')
    if (!r.ok) expect(r.mensaje).toContain(String(BASE_PERSONA_JURIDICA))
    const largo = revisarNit('900000000000000000000')
    if (!largo.ok) expect(largo.mensaje).toContain(String(BASE_MAXIMO))
  })

  it('con 9 dígitos y el dígito mal, avisa que puede ser una cédula de 10 a medio escribir', () => {
    const r = revisarNit('102030405-0')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.motivo).toBe('digito-de-verificacion')
      expect(r.mensaje).toContain('sigue escribiendo')
    }
    const empresa = revisarNit('1020304050-1')
    if (!empresa.ok) expect(empresa.mensaje).not.toContain('sigue escribiendo')
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

/*
 * El guion lo pone el campo (Nico, 2026-09-07: «cuando llegues al número
 * máximo coloca el guion dentro del input»). Como el base puede tener 9 o 10
 * dígitos, va antes del último dígito en cuanto hay diez o más.
 */
describe('formatearNitAlEscribir', () => {
  it('sólo dígitos: quita letras, puntos y espacios', () => {
    expect(formatearNitAlEscribir('900.123.456')).toBe('900123456')
    expect(formatearNitAlEscribir('9a0b0')).toBe('900')
  })

  it('con nueve o menos no pone guion: todavía es el número', () => {
    expect(formatearNitAlEscribir('90012345')).toBe('90012345')
    expect(formatearNitAlEscribir('900123456')).toBe('900123456')
  })

  it('al décimo dígito el guion aparece solo, antes del último (empresa + DV)', () => {
    expect(formatearNitAlEscribir('9001234568')).toBe('900123456-8')
  })

  it('con once dígitos el guion se corre: cédula de 10 más su DV', () => {
    expect(formatearNitAlEscribir('10203040509')).toBe('1020304050-9')
    expect(formatearNitAlEscribir('900123456-8' + '1')).toBe('9001234568-1')
  })

  it('nunca deja escribir de más: lo que sobra se descarta al teclear', () => {
    expect(formatearNitAlEscribir('900000000000000000000')).toBe('9000000000-0')
    expect(formatearNitAlEscribir('900000000000000000000').length).toBe(LARGO_MAXIMO_AL_ESCRIBIR)
  })

  it('un NIT pegado con puntos y guion queda igual de bien', () => {
    expect(formatearNitAlEscribir('890.903.938-8')).toBe('890903938-8')
    expect(revisarNit(formatearNitAlEscribir('890.903.938-8')).ok).toBe(true)
  })
})
