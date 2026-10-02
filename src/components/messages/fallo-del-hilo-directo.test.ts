/**
 * 02-10-2026 · Abrir una conversación directa: las dos reglas del back tienen
 * su frase; todo lo demás va por el traductor (antes era «Intenta de nuevo»,
 * como si cualquier fallo fuera la red).
 */
import { describe, it, expect } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { mensajeDelHiloDirecto } from './fallo-del-hilo-directo'

describe('mensajeDelHiloDirecto', () => {
  it('404 SIN_CUENTA: no tiene cuenta, no hay dónde escribirle', () => {
    expect(mensajeDelHiloDirecto(new ApiError(404, 'x', 'SIN_CUENTA'))).toContain('no tiene cuenta')
  })

  it('403 SIN_RELACION: la regla, no un error', () => {
    expect(mensajeDelHiloDirecto(new ApiError(403, 'x', 'SIN_RELACION'))).toContain(
      'inmueble o un contrato en común',
    )
  })

  it('otro 403 con su código dice el motivo del back', () => {
    expect(
      mensajeDelHiloDirecto(
        new ApiError(403, 'Perteneces a varias inmobiliarias: elige desde cuál escribes.', 'AGENCIA_AMBIGUA'),
      ),
    ).toBe('Perteneces a varias inmobiliarias: elige desde cuál escribes.')
  })

  it('🔴 un 5xx es de nuestro lado, con la referencia; nunca la conexión', () => {
    const m = mensajeDelHiloDirecto(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
    )
    expect(m).toContain('de nuestro lado')
    expect(m).toContain('ab12cd34')
    expect(m).not.toMatch(/conexi[oó]n/i)
  })

  it('🔴 sin respuesta (status 0), la conexión', () => {
    expect(mensajeDelHiloDirecto(new ApiError(0, 'Failed to fetch'))).toMatch(/conexi[oó]n/i)
  })
})
