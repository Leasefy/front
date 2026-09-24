/**
 * La tabla que mantiene vivas las URLs del tercer renglón de Pagos después de
 * que ese renglón desapareció (Nico, 2026-09-16).
 *
 * Lo que se cuida acá, y por qué cada cosa:
 *
 *   1. Toda URL vieja llega a una pantalla que EXISTE. Seis de ellas
 *      estuvieron en el menú del módulo de la plata durante meses.
 *   2. 🔴 El ORDEN en `next.config.mjs`: esta tabla va PRIMERA, antes de
 *      `RUTAS_POR_CICLO_DE_VIDA_DATA`, que trae `/ai/pagos/:path*` y se
 *      comería los seis gemelos. Ese orden no se puede ver leyendo ninguno de
 *      los dos archivos por separado, así que se lee el config de verdad.
 *   3. Ninguna cadena de dos saltos, contra TODAS las tablas del panel.
 *   4. Las tres pantallas que se borraron ya no tienen carpeta, y las tres que
 *      se mudaron sí la tienen en su destino: una redirección a un 404 es peor
 *      que no tener redirección.
 *   5. Que no quede un solo enlace vivo a las seis rutas viejas.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'

import { describe, it, expect } from 'vitest'

import { LA_SALA_DE_PAGOS_SE_FUE } from './la-sala-de-pagos-se-fue'
import { UN_SOLO_MODULO_DE_PLATA } from './un-solo-modulo-de-plata'
import { CONCILIACION_EN_UN_SOLO_LUGAR } from './conciliacion-en-un-solo-lugar'
import { RUTAS_POR_CICLO_DE_VIDA } from './rutas-por-ciclo-de-vida'
import { RUTAS_UNIFICADAS_DEL_PANEL } from './rutas-unificadas-del-panel'
import { PANEL } from './arquitectura-del-panel'

const P = PANEL
const RAIZ = process.cwd()
const APP = join(RAIZ, 'src/app/panel/inmobiliaria')

/** El orden REAL con que Next las evalúa, tal cual lo arma `next.config.mjs`. */
const EN_ORDEN = [
  ...LA_SALA_DE_PAGOS_SE_FUE,
  ...RUTAS_POR_CICLO_DE_VIDA,
  ...RUTAS_UNIFICADAS_DEL_PANEL,
  ...CONCILIACION_EN_UN_SOLO_LUGAR,
  ...UN_SOLO_MODULO_DE_PLATA,
]

/** Resuelve una URL contra una tabla como lo haría Next: primera que calza. */
function resolver(url: string, tabla = EN_ORDEN): string | null {
  for (const r of tabla) {
    const comodin = r.source.endsWith('/:path*')
    const base = comodin ? r.source.slice(0, -'/:path*'.length) : r.source
    if (url === base) return comodin ? r.destination.replace('/:path*', '') : r.destination
    if (comodin && url.startsWith(`${base}/`)) {
      return r.destination.replace('/:path*', url.slice(base.length))
    }
  }
  return null
}

/** ¿Hay `page.tsx` para esta ruta del panel? Route groups `(…)` incluidos. */
function tienePagina(href: string): boolean {
  const segmentos = href.replace(P, '').split('/').filter(Boolean)
  const buscar = (dir: string, i: number): boolean => {
    if (i === segmentos.length) return existsSync(join(dir, 'page.tsx'))
    if (!existsSync(dir)) return false
    const candidatos = [join(dir, segmentos[i]!)]
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      if (e.name.startsWith('(') && e.name.endsWith(')')) candidatos.push(join(dir, e.name, segmentos[i]!))
      else if (e.name.startsWith('[') && e.name.endsWith(']')) candidatos.push(join(dir, e.name))
    }
    return candidatos.some((c) => buscar(c, i + 1))
  }
  return buscar(APP, 0)
}

/** Las seis pestañas que dejaron URL, con su destino. */
const CASOS: Array<[string, string]> = [
  // Las tres maquetas que murieron.
  [`${P}/pagos/generar`, `${P}/pagos/cartera/cobros`],
  [`${P}/pagos/reglas`, `${P}/pagos/cartera/reglas-de-mora`],
  [`${P}/pagos/propietarios`, `${P}/pagos/liquidaciones`],
  // Las tres que se mudaron a donde pertenecen.
  [`${P}/pagos/cola`, `${P}/pagos/liquidaciones/por-aprobar`],
  [`${P}/pagos/fallidos`, `${P}/pagos/cobranza/fallidos`],
  [`${P}/pagos/recordatorios`, `${P}/pagos/cobranza/recordatorios`],
]

describe('la Sala de Pagos se fue — cada URL vieja abre lo que le corresponde', () => {
  it.each(CASOS)('%s → %s', (de, a) => {
    expect(resolver(de)).toBe(a)
  })

  it.each(CASOS)('y su gemelo del namespace /ai también, en UN solo salto (%s)', (de, a) => {
    expect(resolver(de.replace(`${P}/pagos/`, `${P}/ai/pagos/`))).toBe(a)
  })

  it.each([...new Set(CASOS.map(([, a]) => a))])('el destino %s tiene su page.tsx', (destino) => {
    expect(tienePagina(destino)).toBe(true)
  })

  it('las tres maquetas ya no tienen carpeta', () => {
    for (const muerta of ['generar', 'reglas', 'propietarios']) {
      expect(existsSync(join(APP, 'pagos', muerta)), muerta).toBe(false)
    }
  })

  it('y las tres mudadas tampoco la tienen en el sitio viejo', () => {
    for (const mudada of ['cola', 'fallidos', 'recordatorios']) {
      expect(existsSync(join(APP, 'pagos', mudada)), mudada).toBe(false)
    }
  })
})

describe('la Sala de Pagos se fue — la tabla', () => {
  it('todas son temporales (307, reversibles) y absolutas al panel', () => {
    for (const r of LA_SALA_DE_PAGOS_SE_FUE) {
      expect(r.permanent).toBe(false)
      expect(r.source.startsWith(`${P}/`)).toBe(true)
      expect(r.destination.startsWith(`${P}/`)).toBe(true)
    }
  })

  it('ninguna fuente lleva comodín: por eso puede ir primera sin tapar nada', () => {
    for (const r of LA_SALA_DE_PAGOS_SE_FUE) expect(r.source).not.toContain(':path*')
  })

  it('ninguna fuente se repite', () => {
    const fuentes = LA_SALA_DE_PAGOS_SE_FUE.map((r) => r.source)
    expect(new Set(fuentes).size).toBe(fuentes.length)
  })

  it('ningún destino es a su vez una fuente, en NINGUNA tabla del panel', () => {
    for (const r of EN_ORDEN) {
      const d = r.destination.replace('/:path*', '')
      expect(resolver(d), `${r.source} → ${d} volvería a redirigir`).toBeNull()
    }
  })

  it('lo que sigue vivo bajo /pagos no se toca', () => {
    for (const quieta of [
      '/pagos',
      '/pagos/recaudo',
      '/pagos/cartera',
      '/pagos/cobranza',
      '/pagos/liquidaciones',
      '/pagos/dispersiones',
      '/pagos/cxp',
      // Las dos del agente que conservan su ruta y pierden la pestaña.
      '/pagos/analitica',
      '/pagos/configuracion',
    ]) {
      expect(resolver(`${P}${quieta}`), quieta).toBeNull()
    }
  })
})

describe('la Sala de Pagos se fue — el orden en next.config.mjs', () => {
  const CONFIG = readFileSync(join(RAIZ, 'next.config.mjs'), 'utf8')

  it('🔴 esta tabla va ANTES de la del ciclo de vida', () => {
    // `/ai/pagos/:path*` vive allá y se comería los seis gemelos: `/ai/pagos/cola`
    // terminaría en `/pagos/cola`, que ya no existe, y de ahí saltaría otra vez.
    const sala = CONFIG.indexOf('...LA_SALA_DE_PAGOS_SE_FUE_DATA')
    const ciclo = CONFIG.indexOf('...RUTAS_POR_CICLO_DE_VIDA_DATA')
    expect(sala).toBeGreaterThan(-1)
    expect(ciclo).toBeGreaterThan(-1)
    expect(sala).toBeLessThan(ciclo)
  })

  it('la tabla está efectivamente cableada al config', () => {
    expect(CONFIG).toContain('la-sala-de-pagos-se-fue.data.mjs')
  })
})

describe('la Sala de Pagos se fue — no queda ningún enlace vivo a las seis', () => {
  it('nadie enlaza a /pagos/{generar,reglas,propietarios,cola,fallidos,recordatorios}', () => {
    // Se recorre en Node y no con `grep` por el mismo motivo que
    // `arquitectura-del-panel.test.ts`: un pipe POSIX no corre bajo cmd.exe.
    const PATRON = /\/panel\/inmobiliaria\/pagos\/(generar|reglas|propietarios|cola|fallidos|recordatorios)\b/
    const EXTENSIONES = new Set(['.ts', '.tsx', '.mjs', '.json'])
    const encontrados: string[] = []
    const recorrer = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const ruta = join(dir, e.name)
        if (e.isDirectory()) {
          recorrer(ruta)
          continue
        }
        if (!EXTENSIONES.has(e.name.slice(e.name.lastIndexOf('.')))) continue
        const relativa = ruta.split(sep).join('/')
        // Estos dos nombran las rutas viejas a propósito: son de lo que hablan.
        if (relativa.endsWith('la-sala-de-pagos-se-fue.test.ts')) continue
        if (relativa.endsWith('la-sala-de-pagos-se-fue.data.mjs')) continue
        if (PATRON.test(readFileSync(ruta, 'utf8'))) encontrados.push(relativa)
      }
    }
    for (const r of ['src', 'tests']) {
      if (existsSync(join(RAIZ, r))) recorrer(join(RAIZ, r))
    }
    expect(encontrados).toEqual([])
  })
})
