/**
 * Guardia de las claves del recorrido guiado del panel (`TourDelPanel`).
 *
 * Las tres claves de cada paso se derivan de su id (`pasos-del-tour.ts`), así
 * que agregar un paso genera claves nuevas sin que nadie las escriba a mano.
 * Sin este test, un paso nuevo saldría en pantalla con la clave cruda
 * (`inmobiliaria.tour.pasos.pagos.cuerpo`) y eso pasa una revisión visual
 * rápida sin que salte.
 *
 * Hermano de `claves-recorrido.test.ts` (el recorrido del candidato) y de
 * `claves-aprobacion.test.ts` (el lado del inquilino).
 */

import { describe, it, expect } from 'vitest'

import es from './locales/es.json'
import en from './locales/en.json'
import { PASOS_DEL_TOUR } from '../../components/tour/pasos-del-tour'

const NS = 'inmobiliaria.tour'

/** Claves sueltas que usa el componente. */
const CLAVES_PLANAS = [
  'saltar',
  'atras',
  'siguiente',
  'empezar',
  'entendido',
  'paso',
  'progreso',
  'cerrar',
  'bienvenida.saludo',
  'bienvenida.titulo',
  'bienvenida.tuInmobiliaria',
  'bienvenida.cuerpo',
  'cierre.titulo',
  'cierre.punto1',
  'cierre.punto2',
  'cierre.punto3',
  'cierre.volver',
].map((c) => `${NS}.${c}`)

const CLAVES_DE_PASOS = PASOS_DEL_TOUR.flatMap((p) =>
  [p.tituloKey, p.cuerpoKey, p.datoKey].filter((k): k is string => typeof k === 'string'),
)

const TODAS = [...CLAVES_PLANAS, ...CLAVES_DE_PASOS]

function leer(diccionario: unknown, clave: string): unknown {
  return clave
    .split('.')
    .reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], diccionario)
}

function existe(diccionario: unknown, clave: string): boolean {
  const v = leer(diccionario, clave)
  return typeof v === 'string' && v.length > 0
}

describe('las claves del recorrido del panel existen en los dos idiomas', () => {
  it('cada paso aporta título, cuerpo y dato', () => {
    expect(CLAVES_DE_PASOS).toHaveLength(PASOS_DEL_TOUR.length * 3)
  })

  it('todas están en español', () => {
    expect(TODAS.filter((c) => !existe(es, c))).toEqual([])
  })

  it('todas están en inglés', () => {
    expect(TODAS.filter((c) => !existe(en, c))).toEqual([])
  })

  it('los dos diccionarios tienen la MISMA forma', () => {
    // Sin esto, un paso traducido a medias en inglés pasaría los tests de
    // arriba si su clave existiera vacía, y sobraría en uno de los dos.
    const forma = (d: unknown): string[] => {
      const salida: string[] = []
      const caminar = (nodo: unknown, prefijo: string) => {
        if (nodo && typeof nodo === 'object') {
          for (const [k, v] of Object.entries(nodo as Record<string, unknown>)) {
            caminar(v, prefijo ? `${prefijo}.${k}` : k)
          }
        } else {
          salida.push(prefijo)
        }
      }
      caminar(d, '')
      return salida.sort()
    }
    expect(forma(leer(en, NS))).toEqual(forma(leer(es, NS)))
  })

  it('el inglés no es el español copiado', () => {
    const identicas = TODAS.filter((c) => leer(es, c) === leer(en, c))
    expect(identicas).toEqual([])
  })

  it('la clave del progreso interpola los dos números', () => {
    for (const d of [es, en]) {
      const v = leer(d, `${NS}.paso`) as string
      expect(v).toContain('{{n}}')
      expect(v).toContain('{{total}}')
    }
  })

  it('la bienvenida interpola el nombre, la inmobiliaria y el total de paradas', () => {
    for (const d of [es, en]) {
      expect(leer(d, `${NS}.bienvenida.saludo`)).toContain('{{nombre}}')
      expect(leer(d, `${NS}.bienvenida.titulo`)).toContain('{{inmobiliaria}}')
      expect(leer(d, `${NS}.bienvenida.cuerpo`)).toContain('{{total}}')
    }
  })

  it('ningún texto del recorrido trae emojis', () => {
    // Regla explícita del pedido. El símbolo de comando (⌘) no es un emoji.
    const emoji = /\p{Extended_Pictographic}/u
    const conEmoji = TODAS.filter((c) => emoji.test(String(leer(es, c)) + String(leer(en, c))))
    expect(conEmoji).toEqual([])
  })
})
