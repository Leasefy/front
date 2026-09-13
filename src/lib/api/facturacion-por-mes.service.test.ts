/**
 * El cable de facturación por mes.
 *
 * Dos cosas que no se ven hasta que fallan en producción: que el cuerpo del
 * POST lleve SÓLO las claves que el DTO declara (`forbidNonWhitelisted: true`
 * en el back devuelve 400 y con él la corrida entera), y que el mes se escriba
 * sin pasar por `new Date('2026-09')`, que en Bogotá cae en agosto.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const getMock = vi.fn()
const postMock = vi.fn()

vi.mock('./client', () => ({
  apiClient: {
    get: (...a: unknown[]) => getMock(...a),
    post: (...a: unknown[]) => postMock(...a),
  },
}))

import {
  facturacionPorMesService,
  mesActual,
  mesLegible,
  mesesParaElegir,
} from './facturacion-por-mes.service'

/** Las claves de `GenerarFacturasDto`, escritas a mano contra el back. */
const CLAVES_DEL_DTO = ['mes', 'claves']

beforeEach(() => {
  getMock.mockReset().mockResolvedValue({})
  postMock.mockReset().mockResolvedValue({})
})

describe('porGenerar', () => {
  it('pide el mes por query, escapado', () => {
    void facturacionPorMesService.porGenerar('2026-09')
    expect(getMock).toHaveBeenCalledWith(
      '/inmobiliaria/facturacion/por-generar?mes=2026-09',
    )
  })
})

describe('generar', () => {
  it('🔴 el cuerpo lleva sólo lo que el DTO declara', () => {
    void facturacionPorMesService.generar('2026-09', ['ct-1|2026-09|INQUILINO'])
    const [, cuerpo] = postMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(Object.keys(cuerpo).every((k) => CLAVES_DEL_DTO.includes(k))).toBe(true)
    expect(cuerpo).toEqual({
      mes: '2026-09',
      claves: ['ct-1|2026-09|INQUILINO'],
    })
  })

  it('sin claves manda sólo el mes: el back emite todas las del mes', () => {
    void facturacionPorMesService.generar('2026-09')
    expect(postMock.mock.calls[0]?.[1]).toEqual({ mes: '2026-09' })
    void facturacionPorMesService.generar('2026-09', [])
    expect(postMock.mock.calls[1]?.[1]).toEqual({ mes: '2026-09' })
  })
})

describe('los meses', () => {
  it('mesActual escribe el mes con dos dígitos', () => {
    expect(mesActual(new Date(2026, 8, 12))).toBe('2026-09')
    expect(mesActual(new Date(2026, 0, 1))).toBe('2026-01')
  })

  it('el selector va del más reciente al más viejo y cruza el año', () => {
    const meses = mesesParaElegir(3, new Date(2026, 1, 15))
    expect(meses).toEqual(['2026-02', '2026-01', '2025-12'])
  })

  it('🔴 el mes se lee en español y NO se corre un mes', () => {
    // `new Date('2026-09')` es UTC; en Bogotá (UTC−5) se renderiza agosto.
    expect(mesLegible('2026-09')).toBe('septiembre de 2026')
    expect(mesLegible('2026-01')).toBe('enero de 2026')
    expect(mesLegible('2026-12')).toBe('diciembre de 2026')
  })

  it('un mes que no se entiende se devuelve tal cual, sin inventar', () => {
    expect(mesLegible('2026-13')).toBe('2026-13')
    expect(mesLegible('septiembre')).toBe('septiembre')
  })
})
