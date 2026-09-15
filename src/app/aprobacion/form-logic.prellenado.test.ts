import { describe, it, expect } from 'vitest'
import { prellenadoDesdeUrl } from './form-logic'

const CIUDADES = ['Bogotá', 'Medellín', 'Cali']

describe('prellenadoDesdeUrl', () => {
  it('toma canon, ciudad y tipo que vienen de la ficha', () => {
    const p = new URLSearchParams('canon=1800000&ciudad=medellin&tipo=casa')
    expect(prellenadoDesdeUrl(p, CIUDADES)).toEqual({
      canon: '1800000',
      ciudad: 'Medellín',
      tipoInmueble: 'casa',
    })
  })

  it('ignora una ciudad fuera de la lista, un tipo desconocido y un canon inválido', () => {
    const p = new URLSearchParams('canon=abc&ciudad=Pasto&tipo=lote')
    expect(prellenadoDesdeUrl(p, CIUDADES)).toEqual({})
  })
})
