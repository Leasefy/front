/**
 * Guardia de las claves de Naira — viva desde 13-01, antes de la primera clave.
 *
 * Una clave que se agrega solo en `es.json` sale en pantalla como su ruta (`inmobiliaria.ai.naira.loQueSea`) para quien
 * use la app en inglés (i18n-context.tsx:80), y eso pasa una revisión visual rápida sin que salte.
 *
 * A diferencia de claves-avaluos.test.ts, esta guardia RECORRE los namespaces de Naira en vez de listar claves: así
 * 13-02..13-07 no tienen que acordarse de sumar cada clave nueva. Lo único que crece es `IDENTICAS_PERMITIDAS` (una
 * clave cuyo texto es legítimamente igual en los dos idiomas, p. ej. el nombre «Naira»), cada una con su razón.
 *
 * 13-01 no pinta copy: hoy los namespaces están vacíos. Lo que hace viva a la guardia es el control positivo (el mismo
 * recorrido encuentra hojas en un bloque existente y el comparador acusa una clave solo en `es`) y la mutación en copia
 * del bloque automático del plan (una clave de Naira solo en `es.json` ⇒ rojo).
 */

import { describe, expect, it } from 'vitest'

import es from './locales/es.json'
import en from './locales/en.json'

/** Todo lo que cuelga de estos prefijos es de Naira. */
const NAMESPACES_DE_NAIRA = ['inmobiliaria.ai.naira', 'inmobiliaria.ai.intro.naira'] as const
/** Claves sueltas de Naira fuera de su namespace (navegación). */
const CLAVES_SUELTAS_DE_NAIRA = ['inmobiliaria.ai.nav.naira', 'inmobiliaria.ai.nav.nairaHint'] as const
/** clave ⇒ razón por la que su texto es igual en los dos idiomas. Vacía en 13-01. */
const IDENTICAS_PERMITIDAS: Readonly<Record<string, string>> = {
  'inmobiliaria.ai.nav.naira': '«Naira» es nombre propio: se escribe igual en los dos idiomas',
  'inmobiliaria.ai.naira.tabs.briefing': '«Briefing» es el préstamo que el panel usa igual en español y en inglés',
}

function leer(diccionario: unknown, clave: string): unknown {
  return clave.split('.').reduce<unknown>((a, p) => {
    if (a !== null && typeof a === 'object' && Object.hasOwn(a, p)) return (a as Record<string, unknown>)[p]
    return undefined
  }, diccionario)
}

/** Las hojas bajo un prefijo (vacío si el prefijo no existe). */
function hojas(diccionario: unknown, prefijo: string): Map<string, unknown> {
  const salida = new Map<string, unknown>()
  const bajar = (nodo: unknown, ruta: string) => {
    if (nodo !== null && typeof nodo === 'object' && !Array.isArray(nodo)) {
      for (const [k, v] of Object.entries(nodo)) bajar(v, ruta + '.' + k)
    } else {
      salida.set(ruta, nodo)
    }
  }
  const raiz = leer(diccionario, prefijo)
  if (raiz !== undefined) bajar(raiz, prefijo)
  return salida
}

function hojasDeNaira(diccionario: unknown): Map<string, unknown> {
  const salida = new Map<string, unknown>()
  for (const ns of NAMESPACES_DE_NAIRA) for (const [k, v] of hojas(diccionario, ns)) salida.set(k, v)
  for (const clave of CLAVES_SUELTAS_DE_NAIRA) {
    const v = leer(diccionario, clave)
    if (v !== undefined) salida.set(clave, v)
  }
  return salida
}

/** Las claves que están en un idioma y no en el otro. */
function diferencias(a: Map<string, unknown>, b: Map<string, unknown>): { soloEnA: string[]; soloEnB: string[] } {
  return {
    soloEnA: [...a.keys()].filter((k) => !b.has(k)).sort(),
    soloEnB: [...b.keys()].filter((k) => !a.has(k)).sort(),
  }
}

function parametros(texto: string): string[] {
  return [...texto.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]!).sort()
}

const ES = hojasDeNaira(es)
const EN = hojasDeNaira(en)

describe('las claves de Naira existen en los dos idiomas', () => {
  it('[N13:i18n-es-en] las mismas hojas en es y en, cada una un texto no vacío', () => {
    expect(diferencias(ES, EN)).toEqual({ soloEnA: [], soloEnB: [] })
    for (const [clave, v] of [...ES, ...EN]) {
      expect(typeof v === 'string' && v.trim().length > 0, clave).toBe(true)
    }
  })

  it('[N13:i18n-parametros] los {{parámetros}} coinciden y no hay llaves simples', () => {
    for (const [clave, v] of ES) {
      const otro = EN.get(clave)
      if (typeof v !== 'string' || typeof otro !== 'string') continue
      expect(parametros(v), clave).toEqual(parametros(otro))
      for (const texto of [v, otro]) {
        const sinDobles = texto.replace(/\{\{\s*\w+\s*\}\}/g, '')
        expect(/\{[^{}]*\}/.test(sinDobles), clave + ': ' + texto).toBe(false)
      }
    }
  })

  it('[N13:i18n-sin-traducir] una hoja igual en los dos idiomas solo si está en IDENTICAS_PERMITIDAS', () => {
    const identicas = [...ES].filter(([clave, v]) => EN.get(clave) === v).map(([clave]) => clave)
    expect(identicas.filter((clave) => !Object.hasOwn(IDENTICAS_PERMITIDAS, clave))).toEqual([])
    for (const razon of Object.values(IDENTICAS_PERMITIDAS)) expect(razon.trim().length).toBeGreaterThan(0)
  })

  it('[N13:control-positivo] el recorrido encuentra hojas en un bloque existente y el comparador acusa una clave solo en es', () => {
    const avaluosEs = hojas(es, 'inmobiliaria.ai.workspace.pages.avaluos')
    const avaluosEn = hojas(en, 'inmobiliaria.ai.workspace.pages.avaluos')
    expect(avaluosEs.size).toBeGreaterThan(10)
    expect(avaluosEn.size).toBeGreaterThan(10)
    const sinteticoEs = hojas({ inmobiliaria: { ai: { naira: { titulo: 'Naira', soloEnEspanol: 'hola' } } } }, 'inmobiliaria.ai.naira')
    const sinteticoEn = hojas({ inmobiliaria: { ai: { naira: { titulo: 'Naira' } } } }, 'inmobiliaria.ai.naira')
    expect(diferencias(sinteticoEs, sinteticoEn)).toEqual({ soloEnA: ['inmobiliaria.ai.naira.soloEnEspanol'], soloEnB: [] })
    expect(hojas(es, 'inmobiliaria.ai.noExiste').size).toBe(0)
  })
})
