import { describe, it, expect } from 'vitest'
import { tramosDeCoincidencia } from '../tramos-de-coincidencia'

const resaltado = (texto: string, consulta: string) =>
  tramosDeCoincidencia(texto, consulta)
    .filter((t) => t.coincide)
    .map((t) => t.texto)

describe('tramosDeCoincidencia', () => {
  it('sin consulta, todo el texto sin resaltar', () => {
    expect(tramosDeCoincidencia('Cobranza', '')).toEqual([{ texto: 'Cobranza', coincide: false }])
    expect(tramosDeCoincidencia('Cobranza', '   ')).toEqual([{ texto: 'Cobranza', coincide: false }])
  })

  it('ignora mayúsculas y tildes, pero resalta el texto ORIGINAL', () => {
    expect(resaltado('María Fernanda Ospina', 'maria')).toEqual(['María'])
    expect(resaltado('Conciliación bancaria', 'CONCILIACION')).toEqual(['Conciliación'])
  })

  it('reconstruye el texto completo, en orden', () => {
    const tramos = tramosDeCoincidencia('Ir a Cobranza', 'cob')
    expect(tramos.map((t) => t.texto).join('')).toBe('Ir a Cobranza')
    expect(tramos).toEqual([
      { texto: 'Ir a ', coincide: false },
      { texto: 'Cob', coincide: true },
      { texto: 'ranza', coincide: false },
    ])
  })

  it('si la frase entera no aparece, resalta cada palabra', () => {
    expect(resaltado('Pagos · Cartera', 'cartera pagos')).toEqual(['Pagos', 'Cartera'])
  })

  it('lo que no aparece no se resalta', () => {
    expect(resaltado('Contratos', 'zzz')).toEqual([])
  })

  it('la ñ se encuentra escribiendo n', () => {
    expect(resaltado('Peñalosa', 'penal')).toEqual(['Peñal'])
  })
})
