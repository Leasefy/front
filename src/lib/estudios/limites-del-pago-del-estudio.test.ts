/** 02-10-2026 · El espejo del tope del pago del estudio (back: `limites-del-estudio.ts`). */
import { describe, expect, it } from 'vitest'
import { MENSAJES_DEL_ESTUDIO, VALOR_MAXIMO_DEL_ESTUDIO_COP, revisarValorDelEstudio } from './limites-del-pago-del-estudio'

describe('revisarValorDelEstudio', () => {
  it('vacío no opina; el tope justo pasa y un peso más no', () => {
    expect(revisarValorDelEstudio(null)).toBeUndefined()
    expect(revisarValorDelEstudio(VALOR_MAXIMO_DEL_ESTUDIO_COP)).toBeUndefined()
    expect(revisarValorDelEstudio(VALOR_MAXIMO_DEL_ESTUDIO_COP + 1)).toBe(MENSAJES_DEL_ESTUDIO.valorMaximo)
  })

  it('cero dice que tiene que ser mayor que cero', () => {
    expect(revisarValorDelEstudio(0)).toBe(MENSAJES_DEL_ESTUDIO.valorMinimo)
  })

  it('el tope cabe en la columna int4', () => {
    expect(VALOR_MAXIMO_DEL_ESTUDIO_COP).toBeLessThanOrEqual(2_147_483_647)
  })
})
