/**
 * El texto de un fallo en el backoffice, con la regla de oro (02-10-2026).
 * Antes: `err instanceof ApiError ? err.message : 'Error de red'`.
 * Ronda 26 (23-10): sin «Cannot GET…», sin el texto de un 5xx y sin variables del servidor.
 */
import { afterEach, describe, it, expect, vi } from 'vitest'
import { ApiError } from './api'
import {
  MENSAJE_FALTA_CONFIGURACION,
  MENSAJE_PARTE_QUE_NO_ESTA,
  MENSAJE_SIN_RESPUESTA_DEL_ADMIN,
  mensajeDelAdmin,
} from './errores-del-admin'

describe('mensajeDelAdmin', () => {
  afterEach(() => vi.restoreAllMocks())

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

  it('🔴 un 5xx NUNCA muestra el texto del servidor (ni el del back ni el del micro)', () => {
    const delBack = mensajeDelAdmin(
      new ApiError(502, 'Micro de agentes inalcanzable', { statusCode: 502, message: 'Micro de agentes inalcanzable', referencia: 'cd34ef56' }),
    )
    expect(delBack).not.toContain('Micro de agentes')
    expect(delBack).toMatch(/falló de nuestro lado/)
    expect(delBack).toContain('cd34ef56')
    const delMicro = mensajeDelAdmin(new ApiError(500, 'Error 500', { success: false, error: 'connect ECONNREFUSED 127.0.0.1:5432' }))
    expect(delMicro).not.toContain('ECONNREFUSED')
    expect(delMicro).toMatch(/falló de nuestro lado/)
  })

  it('🔴 un 404 de RUTA («Cannot GET /api/…») no sale en inglés', () => {
    const texto = mensajeDelAdmin(new ApiError(404, 'Cannot GET /api/v1/admin/plataforma'))
    expect(texto).toBe(MENSAJE_PARTE_QUE_NO_ESTA)
    expect(texto).not.toMatch(/Cannot|GET|\/api/)
  })

  it('un 404 de un dato que no existe sí dice lo que mandó el back', () => {
    expect(mensajeDelAdmin(new ApiError(404, 'Esa inmobiliaria no existe.'))).toBe('Esa inmobiliaria no existe.')
  })

  it('🔴 un mensaje con una variable del servidor no se muestra', () => {
    const texto = mensajeDelAdmin(
      new ApiError(400, 'Error 400', { error: 'PRESCORING_PLATFORM_TENANT_ID no está configurado en el micro' }),
    )
    expect(texto).toBe(MENSAJE_FALTA_CONFIGURACION)
    expect(texto).not.toMatch(/[A-Z_]{8,}/)
  })

  it('sin respuesta y con internet: el servidor no respondió (no se culpa a la persona)', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    expect(mensajeDelAdmin(new TypeError('Failed to fetch'))).toBe(MENSAJE_SIN_RESPUESTA_DEL_ADMIN)
    expect(mensajeDelAdmin(new ApiError(0, 'NEXT_PUBLIC_ADMIN_API_URL is not configured'))).toBe(MENSAJE_SIN_RESPUESTA_DEL_ADMIN)
  })

  it('sin respuesta y sin internet: ahí sí se habla de la conexión', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(mensajeDelAdmin(new TypeError('Failed to fetch'))).toMatch(/conexión/)
  })

  it('un `TypeError` de JavaScript no se le achaca a la red', () => {
    expect(mensajeDelAdmin(new TypeError('x is not a function'), { porDefecto: 'No se pudo.' })).toBe('No se pudo.')
  })
})
