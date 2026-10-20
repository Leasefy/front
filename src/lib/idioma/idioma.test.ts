import { describe, expect, it } from 'vitest'

import { conIdioma, esRutaPublica, idiomaDelNavegador, idiomaParaLaVisita, separarIdioma } from './idioma'

describe('el idioma de la parte pública (Nico, 16-10-2026)', () => {
  it('separa el prefijo de la ruta', () => {
    expect(separarIdioma('/en/propiedades/1')).toEqual({ idioma: 'en', ruta: '/propiedades/1' })
    expect(separarIdioma('/es')).toEqual({ idioma: 'es', ruta: '/' })
    expect(separarIdioma('/propiedades')).toEqual({ idioma: null, ruta: '/propiedades' })
    // «/enlaces» no es «/en» + «laces».
    expect(separarIdioma('/enlaces')).toEqual({ idioma: null, ruta: '/enlaces' })
  })

  it('sólo lo público lleva idioma; el panel no', () => {
    expect(esRutaPublica('/')).toBe(true)
    expect(esRutaPublica('/propiedades/abc')).toBe(true)
    expect(esRutaPublica('/i/nogal')).toBe(true)
    expect(esRutaPublica('/panel/inmobiliaria')).toBe(false)
    expect(esRutaPublica('/publicar')).toBe(false)
    expect(esRutaPublica('/inquilino')).toBe(false)
    // La verificación del certificado de la Calificación Leasefy, sí; la del panel del inquilino, no.
    expect(esRutaPublica('/verificar-calificacion/AB3D-E7FH')).toBe(true)
    expect(esRutaPublica('/inquilino/calificacion')).toBe(false)
  })

  it('pone el prefijo a lo público y respeta ? y #', () => {
    expect(conIdioma('/', 'es')).toBe('/es')
    expect(conIdioma('/propiedades?q=laureles', 'en')).toBe('/en/propiedades?q=laureles')
    expect(conIdioma('/#producto', 'en')).toBe('/en#producto')
    expect(conIdioma('/en/blog', 'es')).toBe('/es/blog')
    expect(conIdioma('/panel/inmobiliaria', 'en')).toBe('/panel/inmobiliaria')
  })

  it('lee el idioma del navegador por su peso', () => {
    expect(idiomaDelNavegador('en-US,en;q=0.9,es;q=0.8')).toBe('en')
    expect(idiomaDelNavegador('es-CO,es;q=0.9,en;q=0.8')).toBe('es')
    expect(idiomaDelNavegador('fr-FR,fr;q=0.9,en;q=0.5')).toBe('en')
    expect(idiomaDelNavegador('de-DE')).toBe('es')
    expect(idiomaDelNavegador(null)).toBe('es')
    expect(idiomaDelNavegador('es;q=0.2,en;q=0.7')).toBe('en')
  })

  it('lo que la persona eligió antes manda sobre su navegador', () => {
    expect(idiomaParaLaVisita('es', 'en-US')).toBe('es')
    expect(idiomaParaLaVisita(undefined, 'en-US')).toBe('en')
    expect(idiomaParaLaVisita('fr', 'en-US')).toBe('en')
  })
})
