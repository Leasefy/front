import { describe, it, expect } from 'vitest'
import { estiloDeLaFranja, largoDeLaCifraMasLarga } from './cifra-que-cabe'

describe('la cifra que cabe en su ficha (15-10)', () => {
  it('la franja toma el largo de su cifra más larga, con centavos', () => {
    expect(largoDeLaCifraMasLarga(['$ 1.636.622.564', '$ 7.112.907.502,14', '$ 0'])).toBe(18)
    expect(estiloDeLaFranja(['$ 7.112.907.502,14'])).toEqual({ '--largo-de-la-cifra': '18' })
  })

  it('sin cifras no divide por cero', () => {
    expect(largoDeLaCifraMasLarga([])).toBe(1)
  })
})
