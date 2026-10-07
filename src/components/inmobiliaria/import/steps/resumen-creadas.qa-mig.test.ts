/** QA-MIG-A MG-36: la frase final dice cuántos inmuebles son NUEVOS. */
import { describe, it, expect } from 'vitest'

import { detalleDeReusados, lineaDeCreados } from './StepConfirmImport'

describe('lineaDeCreados / detalleDeReusados', () => {
  it('una reimportación de 4 que ya estaban no dice «se crearon 4»', () => {
    const c = { creadas: 4, inmuebles: 4, nuevos: 0 }
    expect(lineaDeCreados(c, 4)).toBe('Se crearon 0 inmuebles nuevos en tu portafolio')
    expect(detalleDeReusados(c)).toBe('4 ya estaban en tu portafolio con el mismo código: no se duplicaron.')
  })

  it('dos filas con el mismo código quedan en un inmueble, y se dice', () => {
    const c = { creadas: 4, inmuebles: 3, nuevos: 3 }
    expect(lineaDeCreados(c, 4)).toBe('Se crearon 3 inmuebles nuevos en tu portafolio')
    expect(detalleDeReusados(c)).toBe('1 fila repetía el código de otra fila del archivo: quedaron en el mismo inmueble.')
  })

  it('todo nuevo: sin detalle', () => {
    const c = { creadas: 12, inmuebles: 12, nuevos: 12 }
    expect(lineaDeCreados(c, 12)).toBe('Se crearon 12 inmuebles nuevos en tu portafolio')
    expect(detalleDeReusados(c)).toBeNull()
  })

  it('con un back anterior (sin «nuevos») queda la frase de siempre', () => {
    expect(lineaDeCreados({ creadas: 5 }, 5)).toBe('Se crearon 5 inmuebles en tu portafolio')
    expect(detalleDeReusados({ creadas: 5 })).toBeNull()
  })
})
