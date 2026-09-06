import { describe, it, expect } from 'vitest'
import { qrParaImagen } from './MfaSetupSection'

describe('qrParaImagen', () => {
  it('envuelve el SVG crudo que devuelve la API REST', () => {
    const salida = qrParaImagen('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    expect(salida.startsWith('data:image/svg+xml;utf8,')).toBe(true)
    expect(salida).toContain('%3Csvg')
  })

  it('deja igual lo que ya es data URI', () => {
    const uri = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
    expect(qrParaImagen(uri)).toBe(uri)
  })

  it('deja igual una URL', () => {
    expect(qrParaImagen('https://ejemplo.co/qr.png')).toBe('https://ejemplo.co/qr.png')
  })

  it.each(['', '   '])('sin código devuelve vacío, no un data URI roto', (v) => {
    expect(qrParaImagen(v)).toBe('')
  })

  it('escapa el # del SVG, que en un data URI corta la cadena', () => {
    const salida = qrParaImagen('<svg fill="#000"></svg>')
    expect(salida).not.toContain('#')
  })
})
