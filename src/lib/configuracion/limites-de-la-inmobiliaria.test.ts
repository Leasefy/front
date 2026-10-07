import { describe, expect, it } from 'vitest'
import {
  MAX_MONTO_EN_PESOS,
  MENSAJE_NIT_INVALIDO,
  MENSAJES_DE_LA_INMOBILIARIA as M,
  errorDelNit,
  erroresDeLosTopes,
  normalizarNit,
} from './limites-de-la-inmobiliaria'

describe('erroresDeLosTopes — el espejo de UpdateAgencyDto', () => {
  it('sólo mira lo que viene en los cambios', () => {
    expect(erroresDeLosTopes({ city: 'Medellín' })).toEqual({})
  })

  it('cada texto pasado de su columna dice la frase del back', () => {
    expect(
      erroresDeLosTopes({
        name: 'a'.repeat(201),
        address: 'a'.repeat(301),
        city: 'a'.repeat(51),
        phone: 'a'.repeat(21),
        legalRepresentative: 'a'.repeat(201),
        legalDocumentNumber: 'a'.repeat(21),
      }),
    ).toEqual({
      name: M.nombreLargo,
      address: M.direccionLarga,
      city: M.ciudadLarga,
      phone: M.telefonoLargo,
      legalRepresentative: M.representanteLargo,
      legalDocumentNumber: M.documentoDelRepresentanteLargo,
    })
  })

  it('los montos int4 tienen su techo ($2.000.000.000) y los días son enteros', () => {
    expect(MAX_MONTO_EN_PESOS).toBeLessThanOrEqual(2_147_483_647)
    expect(
      erroresDeLosTopes({
        dispersionMontoDobleAprobacion: 30_000_000_000,
        baseMinimaRetefuenteCop: MAX_MONTO_EN_PESOS + 1,
        paymentDueDay: 5.5,
        disbursementDay: 15.5,
      }),
    ).toEqual({
      dispersionMontoDobleAprobacion: M.montoDobleAprobacionMaximo,
      baseMinimaRetefuenteCop: M.baseMinimaRetefuenteMaxima,
      paymentDueDay: M.diaDePagoEntero,
      disbursementDay: M.diaDeGiroEntero,
    })
    expect(erroresDeLosTopes({ dispersionMontoDobleAprobacion: null })).toEqual({})
  })

  it('el NIT sigue la regla del registro (6 a 10 dígitos, DV opcional) y se manda sin puntos', () => {
    expect(normalizarNit('901.234.567-8')).toBe('901234567-8')
    expect(errorDelNit('901.234.567-8')).toBeUndefined()
    expect(errorDelNit('123456')).toBeUndefined()
    expect(errorDelNit('12345')).toBe(MENSAJE_NIT_INVALIDO)
    expect(errorDelNit('12345678901')).toBe(MENSAJE_NIT_INVALIDO)
    expect(errorDelNit('ABC-1')).toBe(MENSAJE_NIT_INVALIDO)
    expect(errorDelNit('')).toBeUndefined()
  })
})
