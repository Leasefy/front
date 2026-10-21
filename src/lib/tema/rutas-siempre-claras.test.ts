import { describe, expect, it } from 'vitest'
import { esRutaSiempreClara } from './rutas-siempre-claras'

describe('esRutaSiempreClara', () => {
  it('la parte pública va siempre en claro, con o sin idioma', () => {
    for (const r of ['/', '/es', '/en', '/propiedades', '/es/propiedades', '/es/propiedades/abc', '/i/portofino', '/es/i/portofino', '/pricing', '/para/inmobiliarias', '/auth', '/auth/enlace', '/blog/x', '/avaluo']) {
      expect(esRutaSiempreClara(r), r).toBe(true)
    }
  })

  it('los paneles respetan el tema de la persona', () => {
    for (const r of ['/panel/inmobiliaria', '/inquilino', '/panel/propiedades', '/admin', '/avaluo-ia', '/iniciar', '/esquema', '/propiedadesx', null, '']) {
      expect(esRutaSiempreClara(r as string), String(r)).toBe(false)
    }
  })
})
