import { describe, expect, it } from 'vitest'

import { fraseDelBloque } from './en-bloque'

describe('fraseDelBloque', () => {
  it('todas: sólo la cuenta', () => {
    expect(fraseDelBloque({ total: 3, hechos: 3, fallidos: [], detenido: false })).toBe('Listo: 3 de 3.')
  })

  it('con fallos: cuántos y por qué, hasta tres nombres', () => {
    const f = fraseDelBloque({
      total: 6,
      hechos: 1,
      detenido: false,
      fallidos: [
        { id: '1', nombre: 'Ana', motivo: 'No tiene correo.' },
        { id: '2', nombre: 'Luis', motivo: 'El correo no salió' },
        { id: '3', nombre: 'Eva', motivo: 'Sin cuenta' },
        { id: '4', nombre: 'Juan', motivo: 'Sin cuenta' },
        { id: '5', nombre: 'Rita', motivo: 'Sin cuenta' },
      ],
    })
    expect(f).toBe('Listo: 1 de 6. No se pudo con 5: Ana (no tiene correo); Luis (el correo no salió); Eva (sin cuenta) y 2 más.')
  })

  it('detenido: lo dice', () => {
    expect(fraseDelBloque({ total: 4, hechos: 2, fallidos: [], detenido: true })).toBe('Listo: 2 de 4. Lo detuvieron antes de terminar.')
  })
})
