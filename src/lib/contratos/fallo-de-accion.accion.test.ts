/**
 * 02-10-2026 · `mensajeDelFallo` acepta `accion`: un 5xx dice qué no se pudo
 * hacer («No pudimos cancelar el contrato: algo falló de nuestro lado…») en
 * vez de la frase general. Sin ella, todo sigue igual.
 */
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { mensajeDelFallo } from './fallo-de-accion'

const UN_500 = new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
  statusCode: 500,
  code: 'ERROR_INTERNO',
  referencia: 'ab12cd34',
})

describe('mensajeDelFallo con `accion`', () => {
  it('🔴 un 5xx nombra lo que no se pudo hacer, con la referencia', () => {
    const texto = mensajeDelFallo(UN_500, 'No se pudo cancelar.', 'cancelar el contrato')
    expect(texto).toContain('No pudimos cancelar el contrato: algo falló de nuestro lado')
    expect(texto).toContain('ab12cd34')
  })

  it('sin `accion`, el 5xx dice la frase general de siempre', () => {
    const texto = mensajeDelFallo(UN_500, 'No se pudo cancelar.')
    expect(texto).toMatch(/^Algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
  })

  it('un 4xx sigue diciendo el motivo del back, con o sin `accion`', () => {
    const error = new ApiError(409, 'El contrato ya está cancelado.', 'YA_CANCELADO')
    expect(mensajeDelFallo(error, 'No se pudo cancelar.', 'cancelar el contrato')).toBe('El contrato ya está cancelado.')
  })

  it('sin respuesta, la conexión (la `accion` no cambia eso)', () => {
    expect(mensajeDelFallo(new TypeError('Failed to fetch'), 'x', 'cancelar el contrato')).toMatch(/conexi/i)
  })
})
