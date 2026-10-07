/**
 * 🔴 QA-FACT-CONTA-95 (05-10-2026) · CB-J-08: con un 500 en la portada de
 * Contabilidad, cada tarjeta decía «No cargó: falló del lado del servidor» sin
 * la referencia que trae el back. Sin ella, soporte no puede encontrar el
 * error en el registro.
 */
import { describe, expect, it } from 'vitest'


import { ApiError } from '@/lib/api/client'
import { motivoDelFallo } from './HubDeContabilidad'

describe('🔴 CB-J-08 · un 5xx en la portada dice su referencia', () => {
  it('500 con referencia → «falló del lado del servidor (referencia f4a20ref)»', () => {
    const e = new ApiError(500, 'Internal server error', 'ERROR_INTERNO', {
      statusCode: 500,
      code: 'ERROR_INTERNO',
      message: 'Internal server error',
      referencia: 'f4a20ref',
    })
    expect(motivoDelFallo(e)).toBe('falló del lado del servidor (referencia f4a20ref)')
  })

  it('un 403 sigue diciendo el permiso, sin referencia', () => {
    expect(motivoDelFallo(new ApiError(403, 'No'))).toBe('tu rol no tiene acceso a esta consulta')
  })
})
