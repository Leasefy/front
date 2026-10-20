import { describe, expect, it } from 'vitest'

import { codigoDelEnlace } from './codigo-del-enlace'

describe('el código del certificado que llega en el enlace', () => {
  it('se decodifica una sola vez y se recorta', () => {
    expect(codigoDelEnlace('4PHV-32YE%20')).toBe('4PHV-32YE')
    expect(codigoDelEnlace('%204PHV-32YE')).toBe('4PHV-32YE')
    expect(codigoDelEnlace('4PHV-32YE')).toBe('4PHV-32YE')
  })

  it('un % suelto no rompe la página', () => {
    expect(codigoDelEnlace('4PHV%E0-32YE')).toBe('4PHV%E0-32YE')
  })
})
