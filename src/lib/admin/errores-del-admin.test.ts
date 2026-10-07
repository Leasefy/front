/**
 * El texto de un fallo en el backoffice, con la regla de oro (02-10-2026).
 * Antes: `err instanceof ApiError ? err.message : 'Error de red'`.
 */
import { describe, it, expect } from 'vitest'
import { ApiError } from './api'
import { mensajeDelAdmin } from './errores-del-admin'

describe('mensajeDelAdmin', () => {
  it('un 4xx del back dice lo que mandó', () => {
    expect(mensajeDelAdmin(new ApiError(409, 'Ese slug ya existe.'))).toBe('Ese slug ya existe.')
  })

  it('el micro manda `{ error }`: ése es el texto, no «Error 400»', () => {
    expect(mensajeDelAdmin(new ApiError(400, 'Error 400', { success: false, error: 'no se puede eliminar' }))).toBe(
      'no se puede eliminar',
    )
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia (no «Error 500» ni «Error de red»)', () => {
    const texto = mensajeDelAdmin(
      new ApiError(500, 'Error 500', { statusCode: 500, code: 'ERROR_INTERNO', referencia: 'ab12cd34' }),
      { accion: 'guardar el plan' },
    )
    expect(texto).toMatch(/^No pudimos guardar el plan: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n|red/)
  })

  it('sin respuesta (el fetch no salió): ahí sí se habla de la conexión', () => {
    expect(mensajeDelAdmin(new TypeError('Failed to fetch'))).toMatch(/conexión/)
  })

  it('un `TypeError` de JavaScript no se le achaca a la red', () => {
    expect(mensajeDelAdmin(new TypeError('x is not a function'), { porDefecto: 'No se pudo.' })).toBe('No se pudo.')
  })
})
