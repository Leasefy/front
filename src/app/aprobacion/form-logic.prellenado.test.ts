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

describe('vieneDelPaso1', () => {
  it('sólo con paso=2 en la URL', async () => {
    const { vieneDelPaso1 } = await import('./form-logic')
    expect(vieneDelPaso1(new URLSearchParams('paso=2&canon=1'))).toBe(true)
    expect(vieneDelPaso1(new URLSearchParams('canon=1'))).toBe(false)
  })
})
