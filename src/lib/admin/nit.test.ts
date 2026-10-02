/**
 * El NIT en el backoffice (02-10-2026): la regla del registro, la llamada al
 * back y la frase que dice qué pasó (sobre todo cuando NO todo salió bien).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { adminApi, ApiErrorFalso } = vi.hoisted(() => {
  class ApiErrorFalso extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
    }
  }
  return { adminApi: vi.fn(), ApiErrorFalso }
})
vi.mock('./api', () => ({ adminApi, ApiError: ApiErrorFalso }))

import {
  MENSAJE_NIT_INVALIDO,
  corregirNit,
  errorDelNit,
  mensajeDelFallo,
  resultadoDeLaCorreccion,
  verNit,
  type CorreccionDelNit,
} from './nit'

const ID = '11111111-1111-4111-8111-111111111111'

function correccion(extra: Partial<CorreccionDelNit> = {}): CorreccionDelNit {
  return {
    agencyId: ID,
    nombre: 'Inmobiliaria Andina',
    nit: '901555444-2',
    nitEnElMicro: '901555444-2',
    microLeido: true,
    cambios: [],
    cambiosLeidos: true,
    cambio: true,
    micro: 'actualizado',
    ...extra,
  }
}

beforeEach(() => adminApi.mockReset())

describe('errorDelNit (la regla del registro)', () => {
  it.each(['123456', '900123456', '900123456-8', ' 9001234567 '])('%j se puede mandar', (nit) => {
    expect(errorDelNit(nit)).toBeNull()
  })

  it.each(['900.123.456-8', '12345', '12345678901', '900123456-18', 'abc123456'])(
    '%j no: dice la regla',
    (nit) => {
      expect(errorDelNit(nit)).toBe(MENSAJE_NIT_INVALIDO)
    },
  )

  it('vacío pide escribirlo', () => {
    expect(errorDelNit('   ')).toBe('Escribe el NIT.')
  })
})

describe('las llamadas', () => {
  it('verNit pide GET /tenants/:id/nit', async () => {
    adminApi.mockResolvedValue({})
    await verNit(ID)
    expect(adminApi).toHaveBeenCalledWith(`/tenants/${ID}/nit`, { signal: undefined })
  })

  it('corregirNit manda PATCH con el NIT sin espacios', async () => {
    adminApi.mockResolvedValue(correccion())
    await corregirNit(ID, '  901555444-2 ')
    expect(adminApi).toHaveBeenCalledWith(`/tenants/${ID}/nit`, {
      method: 'PATCH',
      body: { nit: '901555444-2' },
    })
  })

  it('mensajeDelFallo usa el texto del back (409 de otra inmobiliaria)', () => {
    expect(mensajeDelFallo(new ApiErrorFalso(409, 'Ese NIT ya lo tiene otra inmobiliaria: Valle.'))).toBe(
      'Ese NIT ya lo tiene otra inmobiliaria: Valle.',
    )
    expect(mensajeDelFallo(new TypeError('Failed to fetch'))).toMatch(/conexión/)
  })
})

describe('resultadoDeLaCorreccion', () => {
  it('todo bien: quedó y les llegó a los agentes', () => {
    expect(resultadoDeLaCorreccion(correccion())).toEqual({
      tono: 'ok',
      texto: 'El NIT quedó en 901555444-2 y les llegó a los agentes.',
    })
  })

  it('el micro no respondió: aviso, con lo que tiene allá y cómo reintentar', () => {
    const r = resultadoDeLaCorreccion(correccion({ micro: 'no_respondio', nitEnElMicro: '900123456-7' }))
    expect(r.tono).toBe('aviso')
    expect(r.texto).toContain('sigue con 900123456-7')
    expect(r.texto).toContain('Guarda otra vez el mismo NIT')
  })

  it('el micro dijo 200 pero sigue con el viejo (versión anterior): aviso, no «listo»', () => {
    const r = resultadoDeLaCorreccion(correccion({ nitEnElMicro: '900123456-7' }))
    expect(r.tono).toBe('aviso')
    expect(r.texto).toContain('sigue con 900123456-7')
  })

  it('el micro no tiene la inmobiliaria: aviso', () => {
    expect(resultadoDeLaCorreccion(correccion({ micro: 'sin_agencia_en_el_micro' })).tono).toBe('aviso')
  })

  it('todavía no activa: ok, lo recibe al activarse', () => {
    const r = resultadoDeLaCorreccion(correccion({ micro: 'no_aplica', nitEnElMicro: null }))
    expect(r).toEqual({
      tono: 'ok',
      texto:
        'El NIT quedó en 901555444-2. La inmobiliaria todavía no está activa en el micro de agentes: lo recibe cuando se active.',
    })
  })

  it('el mismo NIT: no cambió nada, sólo se volvió a mandar', () => {
    expect(resultadoDeLaCorreccion(correccion({ cambio: false })).texto).toBe(
      'Ya tenía el NIT 901555444-2. Se lo volvimos a mandar a los agentes.',
    )
  })
})
