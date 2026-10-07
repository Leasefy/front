/**
 * 02-10-2026 · El `TypeError: fetch failed` de Node (undici) es un pedido que
 * no salió, igual que el «Failed to fetch» de Chrome.
 *
 * Antes sólo se reconocían los textos de los navegadores: desde el servidor de
 * Next o desde una prueba en Node, un pedido sin respuesta se leía como «algo
 * falló» —o peor, como un fallo nuestro— y no como «sin respuesta».
 */
import { describe, expect, it } from 'vitest'
import { esFalloDeRed, leerElError, RED_CAIDA, suenaARedCaida } from './leer-el-error'
import { esErrorDeConexion } from './estado-de-conexion'
import { leerFallo, mensajeParaLaPersona, MENSAJE_SIN_RESPUESTA } from '@/lib/errores/traductor-de-errores'
import { clasificarFallo } from '@/lib/errores/clasificar'

describe('RED_CAIDA — lo que dice un fetch que no salió', () => {
  it('reconoce el «fetch failed» de Node, además de los navegadores', () => {
    expect(RED_CAIDA).toContain('fetch failed')
    for (const texto of ['Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'Network request failed', 'fetch failed']) {
      expect(suenaARedCaida(texto)).toBe(true)
    }
  })

  it('el TypeError de undici es un fallo de red: status 0', () => {
    const deNode = new TypeError('fetch failed')
    expect(esFalloDeRed(deNode)).toBe(true)
    expect(leerElError(deNode).status).toBe(0)
  })

  it('el de los navegadores sigue siéndolo', () => {
    expect(leerElError(new TypeError('Failed to fetch')).status).toBe(0)
    expect(leerElError(new TypeError('Load failed')).status).toBe(0)
  })

  it('un Error cualquiera que diga «fetch failed» NO es la red (sólo el TypeError del fetch)', () => {
    expect(esFalloDeRed(new Error('fetch failed'))).toBe(false)
    expect(leerElError(new Error('fetch failed')).status).toBeUndefined()
  })

  it('un TypeError de JavaScript tampoco («x is not a function»)', () => {
    expect(esFalloDeRed(new TypeError('x is not a function'))).toBe(false)
  })

  it('el traductor lo dice como «sin respuesta» (conexión), no como un fallo nuestro', () => {
    const deNode = new TypeError('fetch failed')
    expect(leerFallo(deNode).tipo).toBe('sinRespuesta')
    expect(mensajeParaLaPersona(deNode)).toBe(MENSAJE_SIN_RESPUESTA)
  })

  it('el cartel de las lecturas lo pinta como la red, y la franja lo cuenta como conexión', () => {
    expect(clasificarFallo(new TypeError('fetch failed')).tipo).toBe('red')
    // Los hooks viejos guardan sólo el texto: también.
    expect(clasificarFallo('fetch failed').tipo).toBe('red')
    expect(esErrorDeConexion(new TypeError('fetch failed'))).toBe(true)
  })

  it('un error del back sigue leyéndose igual', () => {
    expect(leerElError({ status: 409, detalle: { code: 'YA_EXISTE' } })).toEqual({ status: 409, code: 'YA_EXISTE', servicio: undefined })
  })
})
