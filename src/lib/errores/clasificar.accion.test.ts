/**
 * 02-10-2026 · Un 400/409 de una ACCIÓN no es «un problema nuestro».
 *
 * `clasificarFallo` nació para las LECTURAS: un 400 o un 409 caían al cartel
 * genérico —«No pudimos cargar esto · Fue un problema nuestro, no tuyo»—. En
 * una acción eso es falso dos veces: no se cargaba nada y el back sí dijo qué
 * estaba mal. Con `accion` en el contexto se dice eso; sin ella, todo igual.
 */
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { clasificarFallo } from './clasificar'

const SOBRE_400 = new ApiError(400, ['La categoría no es válida.'], 'DATOS_INVALIDOS', {
  statusCode: 400,
  code: 'DATOS_INVALIDOS',
  message: ['La categoría no es válida.'],
  campos: [{ campo: 'category', regla: 'opcion', mensaje: 'La categoría no es válida.' }],
})

const CONFLICTO_409 = new ApiError(409, 'Este caso ya lo resolvió otra persona.', 'YA_RESUELTO', {
  statusCode: 409,
  code: 'YA_RESUELTO',
  message: 'Este caso ya lo resolvió otra persona.',
})

describe('clasificarFallo con `accion`', () => {
  it('🔴 un 400 de una acción dice qué está mal y no culpa a nadie', () => {
    const fallo = clasificarFallo(SOBRE_400, { accion: 'resolver el caso' })
    expect(fallo.tipo).toBe('rechazado')
    expect(fallo.titulo).toBe('No pudimos resolver el caso')
    expect(fallo.descripcion).toBe('La categoría no es válida.')
    expect(`${fallo.titulo} ${fallo.descripcion}`).not.toMatch(/nuestro|conexi/i)
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  it('🔴 un 409 de una acción dice el choque con las palabras del back', () => {
    const fallo = clasificarFallo(CONFLICTO_409, { accion: 'resolver el caso' })
    expect(fallo.tipo).toBe('rechazado')
    expect(fallo.descripcion).toBe('Este caso ya lo resolvió otra persona.')
    expect(fallo.descripcion).not.toMatch(/nuestro/i)
  })

  it('un 4xx sin nada legible no deja la descripción vacía', () => {
    const fallo = clasificarFallo(new ApiError(422, ''), { accion: 'guardar la regla' })
    expect(fallo.tipo).toBe('rechazado')
    expect(fallo.descripcion).toMatch(/Revisa los datos/)
  })

  it('el status que los hooks del micro guardan como texto («400») también cuenta', () => {
    expect(clasificarFallo('400', { accion: 'aprobar' }).tipo).toBe('rechazado')
  })

  it('los 4xx con cartel propio siguen con el suyo: 404, 403', () => {
    expect(clasificarFallo(new ApiError(404, 'x'), { accion: 'aprobar' }).tipo).toBe('noExiste')
    expect(clasificarFallo(new ApiError(403, 'x'), { accion: 'aprobar' }).tipo).toBe('sinPermiso')
  })

  it('un 5xx de una acción sigue siendo nuestro', () => {
    expect(clasificarFallo(new ApiError(500, 'boom'), { accion: 'aprobar' }).tipo).toBe('servidor')
  })

  it('las LECTURAS siguen igual: sin `accion`, un 400 es el cartel de siempre', () => {
    const fallo = clasificarFallo(SOBRE_400)
    expect(fallo.tipo).toBe('servidor')
    expect(fallo.titulo).toBe('No pudimos cargar esto')
  })

  it('una `accion` vacía no cuenta como acción', () => {
    expect(clasificarFallo(SOBRE_400, { accion: '  ' }).tipo).toBe('servidor')
  })
})
