import { describe, it, expect } from 'vitest'
import { paresLegibles } from './LoQueEntendimos'

describe('paresLegibles', () => {
  it('sin interpretación no hay nada que mostrar', () => {
    expect(paresLegibles(undefined)).toEqual([])
    expect(paresLegibles({})).toEqual([])
  })

  it('ordena de lo general a lo específico, no como venga el objeto', () => {
    const pares = paresLegibles({ 'área': '50-90 m²', ciudad: 'Medellín', tipo: 'apartamento' })
    expect(pares.map(([k]) => k)).toEqual(['tipo', 'ciudad', 'área'])
  })

  it('descarta valores vacíos en vez de pintar una píldora hueca', () => {
    expect(paresLegibles({ ciudad: 'Medellín', barrio: '' })).toEqual([['ciudad', 'Medellín']])
  })

  it('una clave desconocida va al final, no se pierde', () => {
    const pares = paresLegibles({ inventada: 'x', ciudad: 'Cali' })
    expect(pares.map(([k]) => k)).toEqual(['ciudad', 'inventada'])
  })
})
