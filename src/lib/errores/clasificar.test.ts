import { describe, it, expect } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { clasificarFallo, esNoExiste } from './clasificar'

describe('clasificarFallo', () => {
  it('un 404 no se puede reintentar: por más que insistas no va a aparecer', () => {
    const fallo = clasificarFallo(new ApiError(404, 'Property with ID abc not found'))
    expect(fallo.tipo).toBe('noExiste')
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  it('un fallo de red sí se puede reintentar: la red vuelve', () => {
    const fallo = clasificarFallo(new ApiError(0, 'Failed to fetch'))
    expect(fallo.tipo).toBe('red')
    expect(fallo.sePuedeReintentar).toBe(true)
  })

  it('un 500 se puede reintentar: el servidor puede recuperarse', () => {
    const fallo = clasificarFallo(new ApiError(500, 'Internal server error'))
    expect(fallo.tipo).toBe('servidor')
    expect(fallo.sePuedeReintentar).toBe(true)
  })

  it('un 403 no se reintenta: el permiso no cambia por volver a pedirlo', () => {
    const fallo = clasificarFallo(new ApiError(403, 'Forbidden'))
    expect(fallo.tipo).toBe('sinPermiso')
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  it('un 401 manda a entrar de nuevo, no a reintentar', () => {
    const fallo = clasificarFallo(new ApiError(401, 'Unauthorized'))
    expect(fallo.tipo).toBe('sinSesion')
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  it('el mensaje del backend nunca es lo que se muestra', () => {
    const crudo = 'Property with ID 1111-2222 not found'
    const fallo = clasificarFallo(new ApiError(404, crudo), { queEs: 'esa propiedad' })
    expect(fallo.titulo).not.toContain(crudo)
    expect(fallo.descripcion).not.toContain(crudo)
    // pero se conserva, porque sin él no se puede diagnosticar
    expect(fallo.mensajeOriginal).toBe(crudo)
  })

  it('nombra lo que se estaba cargando en vez de decir «esto»', () => {
    expect(clasificarFallo(new ApiError(404, 'x'), { queEs: 'esa propiedad' }).titulo)
      .toBe('No encontramos esa propiedad')
    expect(clasificarFallo(new ApiError(404, 'x')).titulo).toBe('No encontramos esto')
  })

  it('lee el status aunque el servicio haya perdido la clase ApiError', () => {
    // Varios servicios reenvían un objeto plano; si sólo confiáramos en
    // `instanceof` un 404 se degradaría a «error de servidor» y volvería a
    // aparecer el botón de reintentar.
    const fallo = clasificarFallo({ status: 404, message: 'not found' })
    expect(fallo.tipo).toBe('noExiste')
  })

  it('un error sin status es de servidor, que es el supuesto seguro', () => {
    // Seguro porque ofrecer reintentar de más molesta; no ofrecerlo cuando
    // habría funcionado deja a la persona sin salida.
    const fallo = clasificarFallo(new Error('boom'))
    expect(fallo.tipo).toBe('servidor')
    expect(fallo.sePuedeReintentar).toBe(true)
  })

  it('esNoExiste distingue el 404 de todo lo demás', () => {
    expect(esNoExiste(new ApiError(404, 'x'))).toBe(true)
    expect(esNoExiste(new ApiError(500, 'x'))).toBe(false)
    expect(esNoExiste(new Error('x'))).toBe(false)
    expect(esNoExiste(null)).toBe(false)
  })
})
