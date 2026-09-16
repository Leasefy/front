import { describe, it, expect } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { clasificarFallo } from '@/lib/errores/clasificar'
import { falloDelAgente } from './fallo-del-agente'

/*
 * Los hooks del agente guardan el fallo como texto. Si ese texto llega crudo a
 * `FalloDeCarga`, todo se clasifica igual —y un 404 ofrecería reintentar—.
 */
describe('falloDelAgente', () => {
  it('un status de tres dígitos se conserva como status', () => {
    const e = falloDelAgente('502')
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(502)
    expect(clasificarFallo(e).tipo).toBe('servidor')
  })

  it('un 404 del agente no ofrece reintentar', () => {
    const f = clasificarFallo(falloDelAgente('404'))
    expect(f.tipo).toBe('noExiste')
    expect(f.sePuedeReintentar).toBe(false)
  })

  it('sin respuesta del agente es un fallo de red, que sí se reintenta', () => {
    const f = clasificarFallo(falloDelAgente('Failed to fetch'))
    expect(f.tipo).toBe('red')
    expect(f.sePuedeReintentar).toBe(true)
  })
})
