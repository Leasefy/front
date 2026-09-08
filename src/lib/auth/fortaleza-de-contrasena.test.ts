import { describe, it, expect } from 'vitest'
import { CONSEJO_INICIAL, fortalezaDeContrasena } from './fortaleza-de-contrasena'

describe('fortalezaDeContrasena — las cinco barras', () => {
  it('vacía: cero barras, sin etiqueta y el consejo inicial', () => {
    expect(fortalezaDeContrasena('')).toEqual({
      puntaje: 0,
      nivel: 'vacia',
      etiqueta: '',
      cumpleMinimo: false,
      consejo: CONSEJO_INICIAL,
    })
    expect(fortalezaDeContrasena(null).puntaje).toBe(0)
  })

  it('«123456», lo que hoy pasaba: una barra roja, entre las más usadas, no alcanza', () => {
    const f = fortalezaDeContrasena('123456')
    expect(f.puntaje).toBe(1)
    expect(f.nivel).toBe('muy-debil')
    expect(f.cumpleMinimo).toBe(false)
    expect(f.consejo).toContain('más usadas')
  })

  it('una contraseña muy usada disfrazada con símbolos sigue siendo muy usada', () => {
    expect(fortalezaDeContrasena('P-a-s-s-w-o-r-d').consejo).toContain('más usadas')
    expect(fortalezaDeContrasena('Contraseña123!').cumpleMinimo).toBe(false)
  })

  it('corta pero variada («Aa1!») no pasa de dos barras y pide largo', () => {
    const f = fortalezaDeContrasena('Aa1!')
    expect(f.puntaje).toBe(2)
    expect(f.cumpleMinimo).toBe(false)
    expect(f.consejo).toBe('Usa al menos 8 caracteres.')
  })

  it('letras y números en minúscula («casaazul9»): dos barras, débil, pide una mayúscula', () => {
    const f = fortalezaDeContrasena('casaazul9')
    expect(f.puntaje).toBe(2)
    expect(f.nivel).toBe('debil')
    expect(f.cumpleMinimo).toBe(false)
    expect(f.consejo).toBe('Agrega una mayúscula.')
  })

  it('con una mayúscula («Casaazul9») ya es aceptable: tres barras y alcanza', () => {
    const f = fortalezaDeContrasena('Casaazul9')
    expect(f.puntaje).toBe(3)
    expect(f.nivel).toBe('aceptable')
    expect(f.cumpleMinimo).toBe(true)
    expect(f.consejo).toBe('Agrega un símbolo (#, !, $…).')
  })

  it('doce caracteres con dos clases también alcanzan («casaazulgrande9»)', () => {
    const f = fortalezaDeContrasena('casaazulgrande9')
    expect(f.puntaje).toBe(3)
    expect(f.cumpleMinimo).toBe(true)
  })

  it('con las cuatro clases y ocho caracteres es segura («Casa#zul9»)', () => {
    const f = fortalezaDeContrasena('Casa#zul9')
    expect(f.puntaje).toBe(4)
    expect(f.nivel).toBe('segura')
    expect(f.consejo).toBe('Más larga es más segura: 12 caracteres o más.')
  })

  it('doce caracteres con las cuatro clases: muy segura, sin consejo', () => {
    const f = fortalezaDeContrasena('Casa#Azul-2026')
    expect(f.puntaje).toBe(5)
    expect(f.nivel).toBe('muy-segura')
    expect(f.consejo).toBeNull()
  })

  it('una frase larga sin símbolos también llega a cinco (16 caracteres valen por la cuarta clase)', () => {
    expect(fortalezaDeContrasena('MiCasaEsAzulYGrande2026').puntaje).toBe(5)
  })

  it('una secuencia («Abcd1234!») resta una barra y lo dice', () => {
    const f = fortalezaDeContrasena('Abcd1234!')
    expect(f.puntaje).toBe(3)
    expect(f.consejo).toBe('Evita secuencias como 1234 o abcd y letras repetidas.')
  })

  it('una letra repetida cuatro veces («Caaaasa#9») resta una barra', () => {
    expect(fortalezaDeContrasena('Caaaasa#9').puntaje).toBe(3)
  })

  it('el correo adentro de la contraseña resta y lo dice', () => {
    const f = fortalezaDeContrasena('Nicolas#2026', { correo: 'nicolas@gmail.com' })
    expect(f.puntaje).toBe(4)
    expect(f.consejo).toBe('No uses tu correo dentro de la contraseña.')
  })

  it('un correo de tres letras no cuenta como «el correo adentro»', () => {
    expect(fortalezaDeContrasena('Ana#Maria2026', { correo: 'ana@gmail.com' }).consejo).toBeNull()
  })

  it('nunca baja de una barra con algo escrito ni sube de cinco', () => {
    expect(fortalezaDeContrasena('1').puntaje).toBe(1)
    expect(fortalezaDeContrasena('Xk9#mQ2$vL7!pR4&wT8@zN5%').puntaje).toBe(5)
  })
})
