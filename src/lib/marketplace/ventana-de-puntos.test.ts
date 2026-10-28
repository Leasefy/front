import { describe, expect, it } from 'vitest'
import { ventanaDePuntos } from './ventana-de-puntos'

const indices = (total: number, activa: number) => ventanaDePuntos(total, activa).map((p) => p.indice)
const chicos = (total: number, activa: number) => ventanaDePuntos(total, activa).filter((p) => p.chico).map((p) => p.indice)

describe('Los puntos del carrusel con muchas fotos', () => {
  it('con pocas fotos, uno por foto y ninguno chico', () => {
    expect(indices(3, 0)).toEqual([0, 1, 2])
    expect(chicos(3, 2)).toEqual([])
  })
  it('con muchas, nunca más de cinco; la ventana sigue a la foto activa', () => {
    expect(indices(1000, 0)).toEqual([0, 1, 2, 3, 4])
    expect(indices(1000, 500)).toEqual([498, 499, 500, 501, 502])
    expect(indices(1000, 999)).toEqual([995, 996, 997, 998, 999])
  })
  it('los de la orilla se achican si hay más fotos de ese lado', () => {
    expect(chicos(18, 0)).toEqual([4])
    expect(chicos(18, 9)).toEqual([7, 11])
    expect(chicos(18, 17)).toEqual([13])
  })
})
