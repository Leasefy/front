/**
 * Guardia contra el modo de falla silencioso de `useTf`.
 *
 * `tf(clave, respaldo)` es cómodo justamente porque nunca rompe la pantalla:
 * si falta la clave, se lee el español y nadie se entera. El precio es que una
 * traducción faltante **no se nota** — la pantalla en inglés simplemente sale
 * en español, y eso pasa una revisión visual sin problema.
 *
 * Este test lee las claves que los componentes piden de verdad y verifica que
 * existan en los dos idiomas. Falla cuando alguien agrega una cadena nueva y se
 * olvida de traducirla, que es exactamente cuando hay que enterarse.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

import es from './locales/es.json'
import en from './locales/en.json'

const RAIZ = join(__dirname, '../..')

/** Archivos que usan `useTf` para el recorrido de aprobación. */
const FUENTES = [
  'components/tenant/QueSignificaPostularse.tsx',
  'components/tenant/TopeAprobadoBanner.tsx',
  'components/tenant/ResultadoAprobacion.tsx',
  'components/tenant/CrearCuentaDesdeAprobacion.tsx',
]

/**
 * Extrae las claves de `tf(\`${NS}.algo\`, …)` resolviendo el `NS` del archivo.
 * Las que se arman con una variable (`${clave}`) se expanden con los valores
 * literales que aparecen en el mismo archivo.
 */
function clavesDe(rutaRelativa: string): string[] {
  const src = readFileSync(join(RAIZ, rutaRelativa), 'utf8')
  const ns = src.match(/const NS = '([^']+)'/)?.[1]
  if (!ns) return []

  const claves = new Set<string>()
  for (const m of src.matchAll(/tf\(\s*`\$\{NS\}\.([^`]+)`/g)) {
    const cola = m[1]
    if (cola.includes('${')) {
      // `pasos.${clave}.titulo` → se expande con cada `clave: 'x'` del archivo.
      const variantes = [...src.matchAll(/clave: '([^']+)'/g)].map((v) => v[1])
      for (const v of variantes) claves.add(`${ns}.${cola.replace(/\$\{[^}]+\}/, v)}`)
    } else {
      claves.add(`${ns}.${cola}`)
    }
  }
  return [...claves]
}

function existe(diccionario: unknown, clave: string): boolean {
  let actual: unknown = diccionario
  for (const parte of clave.split('.')) {
    if (typeof actual !== 'object' || actual === null) return false
    actual = (actual as Record<string, unknown>)[parte]
  }
  return typeof actual === 'string' && actual.length > 0
}

describe('las claves del recorrido de aprobación existen en los dos idiomas', () => {
  const todas = FUENTES.flatMap(clavesDe)

  it('encuentra claves para revisar (si no, el extractor se rompió)', () => {
    expect(todas.length).toBeGreaterThan(30)
  })

  it.each(FUENTES)('%s — todas sus claves están en es y en en', (fuente) => {
    const faltan = clavesDe(fuente).flatMap((c) => [
      ...(existe(es, c) ? [] : [`es: ${c}`]),
      ...(existe(en, c) ? [] : [`en: ${c}`]),
    ])
    expect(faltan).toEqual([])
  })

  it('el español y el inglés no son el mismo texto (traducción de verdad)', () => {
    // Sin esto, copiar el bloque español a en.json pasaría el test de arriba.
    const identicas = todas.filter((c) => {
      const leer = (d: unknown) =>
        c.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown>)?.[p], d)
      return leer(es) === leer(en)
    })
    // Algunas coinciden legítimamente (nombres propios, "Ciudad"/"Ciudad" no).
    expect(identicas.length).toBeLessThan(todas.length * 0.15)
  })
})
