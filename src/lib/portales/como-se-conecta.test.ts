/**
 * 🔴 Cada portal pide cosas distintas (Nico, 19-09-2026).
 *
 * «¿Estás seguro que eso es todo lo que se necesita para poder conectar con
 * una cuenta de esos portales? Creo que hasta para conectar con cada portal
 * puede ser diferente cada portal. Revisa bien.»
 *
 * Tenía razón. El diálogo pedía los mismos tres campos para los seis portales
 * y el ejemplo del identificador —«el usuario con el que entras a su panel»—
 * es, en Metrocuadrado, el dato EQUIVOCADO: ese portal entrega credenciales de
 * integración aparte. Estas pruebas no comprueban copys: comprueban que la
 * tabla no vuelva a colapsar en un formulario único, y que los tres avisos que
 * de verdad cambian a quién llama la inmobiliaria sigan dichos.
 */

import { describe, it, expect } from 'vitest'
import { COMO_SE_CONECTA, comoSeConecta, CONEXION_GENERICA } from './como-se-conecta'
import { EL_CATALOGO_DE_LEASEFY } from './marca'

describe('cómo se conecta cada portal', () => {
  it('🔴 ningún portal comparte el rótulo del identificador con otro', () => {
    // Si dos coinciden es que alguien volvió al formulario único.
    const rotulos = Object.values(COMO_SE_CONECTA).map((c) => c.rotuloDelIdentificador)
    expect(new Set(rotulos).size).toBe(rotulos.length)
  })

  it('🔴 Metrocuadrado avisa que NO son los datos de entrar al portal', () => {
    // Es el error más caro: pedirle al asesor lo que uno ya tiene.
    expect(COMO_SE_CONECTA.METROCUADRADO!.cuidado).toContain('No son tus datos de entrar')
    expect(COMO_SE_CONECTA.METROCUADRADO!.paraConectarloDeVerdad.join(' ')).toContain('API Key')
  })

  it('🔴 Ciencuadras dice que la contraseña la genera la propia inmobiliaria', () => {
    // Es el único de los cinco que se resuelve solo, en 30 segundos, y nadie
    // se lo estaba diciendo.
    const c = COMO_SE_CONECTA.CIENCUADRAS!
    expect(`${c.cuidado} ${c.paraConectarloDeVerdad.join(' ')}`).toContain('WS3')
  })

  it('🔴 Mercado Libre dice que sin paquete pagado no se crea el aviso', () => {
    // Verificado en developers.mercadolibre.com.co: sin cupos, el POST falla.
    const ml = COMO_SE_CONECTA.MERCADO_LIBRE!
    expect(ml.paraConectarloDeVerdad.join(' ')).toContain('paquete')
    expect(ml.cuidado).toContain('no se conecta con usuario y clave')
    expect(ml.fuente).toContain('developers.mercadolibre.com.co')
  })

  it('Properati dice que se publica en Proppit, no en Properati', () => {
    expect(COMO_SE_CONECTA.PROPERATI!.cuidado).toContain('Proppit')
  })

  it('el catálogo propio no pide nada: es nuestro', () => {
    expect(COMO_SE_CONECTA[EL_CATALOGO_DE_LEASEFY]!.paraConectarloDeVerdad).toHaveLength(1)
  })

  it('todos dicen de dónde salió lo que afirman', () => {
    for (const [portal, c] of Object.entries(COMO_SE_CONECTA)) {
      expect(c.fuente.length, portal).toBeGreaterThan(5)
      expect(c.paraConectarloDeVerdad.length, portal).toBeGreaterThan(0)
    }
  })

  it('un portal que no esté en la tabla cae en lo genérico, no revienta', () => {
    expect(comoSeConecta('UN_PORTAL_NUEVO')).toBe(CONEXION_GENERICA)
  })
})
