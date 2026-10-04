/**
 * Ninguna frase del diccionario nombra una variable de entorno (QA-IA-B,
 * 04-10-2026).
 *
 * 🔴 En el laboratorio, el menú del Piloto decía «El Piloto está apagado en el
 * servidor (PILOTO_ENABLED)» y tres cajones de cobranza «Entorno no
 * configurado (NEXT_PUBLIC_AGENT_URL)». Quien lee eso es la inmobiliaria: no
 * sabe qué es una variable ni puede hacer nada con ella. El porqué técnico va
 * al log; la frase dice qué pasa y a quién avisar.
 */
import { describe, it, expect } from 'vitest'

import es from './locales/es.json'

/** `PILOTO_ENABLED`, `NEXT_PUBLIC_AGENT_URL`, `COBRANZA_WHATSAPP_ENABLED`… */
const VARIABLE_DE_ENTORNO = /\b[A-Z][A-Z0-9]+_[A-Z0-9_]{3,}\b/

function frases(nodo: unknown, camino: string, salida: Array<[string, string]>): Array<[string, string]> {
  if (typeof nodo === 'string') salida.push([camino, nodo])
  else if (nodo && typeof nodo === 'object') {
    for (const [clave, valor] of Object.entries(nodo)) frases(valor, camino ? `${camino}.${clave}` : clave, salida)
  }
  return salida
}

describe('el diccionario en español no nombra variables de entorno', () => {
  it('ninguna frase trae un NOMBRE_DE_VARIABLE', () => {
    const conVariable = frases(es, '', []).filter(([, texto]) => VARIABLE_DE_ENTORNO.test(texto))
    expect(conVariable).toEqual([])
  })
})
