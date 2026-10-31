import { describe, expect, it } from 'vitest'

import { enOtraMoneda, formatoDe, leerLasTasas, type TasasDeCambio } from './moneda-de-referencia'

/** Ver los precios en otra moneda (Nico, 31-10-2026); se cobra siempre en COP. */
const TASAS: TasasDeCambio = {
  disponible: true,
  porPeso: { USD: 0.00025, EUR: 0.00023, MXN: 0.0046, CLP: 0.24 },
  fecha: '2026-10-31',
  fuente: { nombre: 'ExchangeRate-API', url: 'https://www.exchangerate-api.com' },
}
const sinEspaciosDuros = (s: string) => s.replace(/ /g, ' ')

describe('la moneda de referencia', () => {
  it('escribe la referencia con «≈» y el código; el peso chileno sin decimales', () => {
    expect(sinEspaciosDuros(enOtraMoneda(630_000, 'USD', TASAS))).toBe('≈ 158 USD')
    expect(sinEspaciosDuros(enOtraMoneda(2_100, 'USD', TASAS))).toBe('≈ 0,53 USD')
    expect(sinEspaciosDuros(enOtraMoneda(2_100, 'EUR', TASAS))).toBe('≈ 0,48 EUR')
    expect(sinEspaciosDuros(enOtraMoneda(99_000, 'MXN', TASAS))).toBe('≈ 455 MXN')
    expect(sinEspaciosDuros(enOtraMoneda(2_100, 'CLP', TASAS))).toBe('≈ 504 CLP')
  })

  it('en COP, o sin tasa, el precio en pesos de siempre', () => {
    expect(sinEspaciosDuros(formatoDe('COP', TASAS)(2_100))).toBe('$ 2.100')
    expect(sinEspaciosDuros(formatoDe('USD', null)(2_100))).toBe('$ 2.100')
    expect(sinEspaciosDuros(formatoDe('USD', TASAS)(2_100))).toBe('≈ 0,53 USD')
  })

  it('una respuesta sin tasa o con una moneda rara no se usa: nunca un número inventado', () => {
    expect(leerLasTasas(TASAS)).toEqual(TASAS)
    expect(leerLasTasas({ disponible: false })).toBeNull()
    expect(leerLasTasas({ ...TASAS, porPeso: { ...TASAS.porPeso, CLP: 0 } })).toBeNull()
    expect(leerLasTasas({ ...TASAS, porPeso: { USD: 0.00025 } })).toBeNull()
    expect(leerLasTasas(null)).toBeNull()
  })
})
