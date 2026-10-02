import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { falloDelMicro } from './fallo-del-micro'

function respuesta(status: number, cuerpo?: unknown) {
  return {
    status,
    json: async () => {
      if (cuerpo === undefined) throw new SyntaxError('Unexpected end of JSON input')
      return cuerpo
    },
  }
}

describe('falloDelMicro', () => {
  it('un 400 del sobre trae sus campos y su code', async () => {
    const e = await falloDelMicro(
      respuesta(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El motivo no puede pasar de 500 caracteres.'],
        campos: [{ campo: 'motivo', regla: 'longitud_maxima', mensaje: 'El motivo no puede pasar de 500 caracteres.' }],
        success: false,
        error: { name: 'ZodError', issues: [] },
      }),
    )
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(400)
    expect(e.code).toBe('DATOS_INVALIDOS')
    expect(camposDelError(e)).toEqual([
      { campo: 'motivo', regla: 'longitud_maxima', mensaje: 'El motivo no puede pasar de 500 caracteres.' },
    ])
  })

  it('un 500 del micro dice «de nuestro lado» con los 8 primeros del requestId', async () => {
    const e = await falloDelMicro(respuesta(500, { error: 'Internal Server Error', requestId: 'abcdef12-3456' }))
    const texto = mensajeParaLaPersona(e, { accion: 'aprobar la carta' })
    expect(texto).toContain('No pudimos aprobar la carta: algo falló de nuestro lado')
    expect(texto).toContain('abcdef12')
    expect(texto).not.toMatch(/conexi/i)
  })

  it('el `error` en inglés del cuerpo viejo nunca llega a la persona', async () => {
    const e = await falloDelMicro(respuesta(403, { error: 'Forbidden — no membership row' }))
    const texto = mensajeParaLaPersona(e, { porDefecto: 'No tienes permiso para esto.' })
    expect(texto).toBe('No tienes permiso para esto.')
  })

  it('un código viejo en `error` queda como `code` para que la pantalla decida', async () => {
    const e = await falloDelMicro(respuesta(409, { error: 'DUPLICATE_PLAN_RISK' }))
    expect(e.code).toBe('DUPLICATE_PLAN_RISK')
    expect(e.message).toBe('')
  })

  it('sin cuerpo (502 del balanceador) queda sólo el status', async () => {
    const e = await falloDelMicro(respuesta(502))
    expect(e.status).toBe(502)
    expect(mensajeParaLaPersona(e, { accion: 'guardar' })).not.toMatch(/conexi/i)
  })
})
