/**
 * El copy del Piloto: concordancia y plantillas que de verdad interpolan.
 *
 * Dos defectos medidos en pantalla el 2026-09-05, los dos sin una sola línea
 * de cobertura:
 *
 *  1. «Falta 2 cosa para que opere sola». El helper de singular/plural existía
 *     desde el principio y NADIE lo llamaba: el render usaba las claves en
 *     singular a mano, así que `noListoPlural` y `listoConPerosPlural` estaban
 *     escritas y muertas.
 *
 *  2. El `aria-label` de los interruptores era literalmente «Encender o apagar
 *     {agente} para tu inmobiliaria»: el interpolador sólo reconoce LLAVES
 *     DOBLES (`i18n-context.tsx`: /\{\{(\w+)\}\}/g), así que con llave simple
 *     el parámetro se ignora y un lector de pantalla lee la llave.
 */

import { describe, it, expect } from 'vitest'

import es from '@/lib/i18n/locales/es.json'
import { clave } from './PilotoPreparacion'

/** El MISMO regex que usa el interpolador de verdad. */
const INTERPOLA = /\{\{(\w+)\}\}/g
/** Una llave simple: el interpolador NO la ve y sale cruda a la pantalla. */
const LLAVE_SIMPLE = /(^|[^{])\{(\w+)\}([^}]|$)/

function hojas(nodo: unknown, ruta: string): Array<[string, string]> {
  if (typeof nodo === 'string') return [[ruta, nodo]]
  if (nodo === null || typeof nodo !== 'object') return []
  return Object.entries(nodo as Record<string, unknown>).flatMap(([k, v]) =>
    hojas(v, ruta ? `${ruta}.${k}` : k),
  )
}

const PILOTO = (es as unknown as Record<string, Record<string, Record<string, unknown>>>)
  .inmobiliaria!.piloto!

describe('el copy del Piloto no deja llaves crudas en pantalla', () => {
  it.each(hojas(PILOTO, 'inmobiliaria.piloto'))(
    '%s no usa llave simple (el interpolador sólo entiende {{doble}})',
    (_ruta, texto) => {
      expect(LLAVE_SIMPLE.test(texto)).toBe(false)
    },
  )

  it('los tres textos del interruptor sí interpolan el nombre del agente', () => {
    for (const k of ['switchAria', 'toastOn', 'toastOff'] as const) {
      const texto = (PILOTO.gobierno as Record<string, string>)[k]!
      INTERPOLA.lastIndex = 0
      expect([...texto.matchAll(INTERPOLA)].map((m) => m[1])).toContain('agente')
    }
  })
})

describe('singular y plural: «Falta 2 cosa» delata una pantalla sin cuidar', () => {
  it('n === 1 usa la clave en singular', () => {
    expect(clave('noListo', 1)).toBe('inmobiliaria.piloto.preparacion.noListo')
    expect(clave('listoConPeros', 1)).toBe(
      'inmobiliaria.piloto.preparacion.listoConPeros',
    )
  })

  it.each([0, 2, 7])('n === %i usa la clave en plural', (n) => {
    expect(clave('noListo', n)).toBe('inmobiliaria.piloto.preparacion.noListoPlural')
    expect(clave('listoConPeros', n)).toBe(
      'inmobiliaria.piloto.preparacion.listoConPerosPlural',
    )
  })

  it('las cuatro claves existen en el diccionario — ninguna queda huérfana', () => {
    const prep = PILOTO.preparacion as Record<string, string>
    for (const k of ['noListo', 'noListoPlural', 'listoConPeros', 'listoConPerosPlural']) {
      expect(typeof prep[k], `falta ${k}`).toBe('string')
    }
    expect(prep.noListoPlural).toContain('Faltan')
    expect(prep.noListo).toContain('Falta ')
  })
})
