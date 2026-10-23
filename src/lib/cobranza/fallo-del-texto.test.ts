import { describe, expect, it } from 'vitest'
import { clasificarFallo } from '@/lib/errores/clasificar'
import { falloDelTexto } from './fallo-del-texto'

describe('falloDelTexto (C5, r25): el error crudo del hook se vuelve algo que FalloDeCarga sabe decir', () => {
  it('sin error no hay fallo', () => {
    expect(falloDelTexto(null)).toBeNull()
    expect(falloDelTexto('')).toBeNull()
  })
  it('un status se clasifica por su número y no se muestra tal cual', () => {
    const f = clasificarFallo(falloDelTexto('404'))
    expect(f.tipo).toBe('noExiste')
    expect(`${f.titulo} ${f.descripcion}`).not.toContain('404')
  })
  it('un 500 o un texto del micro es un fallo de nuestro lado', () => {
    expect(clasificarFallo(falloDelTexto('500')).tipo).toBe('servidor')
    expect(clasificarFallo(falloDelTexto('Internal error in cartera')).tipo).toBe('servidor')
  })
  it('un error que ya es un objeto pasa igual', () => {
    const e = { status: 403 }
    expect(falloDelTexto(e)).toBe(e)
  })
})
