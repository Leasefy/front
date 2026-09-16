/**
 * La tabla que mantiene vivas las URLs de «Cobros» después de que dejó de ser
 * un módulo (Nico + CEO, 2026-09-15).
 *
 * Lo que se cuida acá, y por qué cada cosa:
 *
 *   1. Toda URL vieja llega a una pantalla que EXISTE. Un 404 en una URL que
 *      está en correos y en cajones del Piloto es la peor forma de enterarse
 *      de que se movió una carpeta.
 *   2. Ninguna cadena de dos saltos: un destino de esta tabla no puede ser
 *      fuente de ninguna otra.
 *   3. 🔴 El ORDEN dentro de la tabla (la general va última) y el orden ENTRE
 *      tablas en `next.config.mjs` (ésta después de la conciliación). Next
 *      aplica la primera regla que calza; con el orden al revés,
 *      `/cobros/extracto-bancario` caería en `/pagos/cartera/cobros/extracto-bancario`,
 *      que no existe. Ese orden no se puede ver leyendo ninguno de los dos
 *      archivos por separado, así que se lee `next.config.mjs` de verdad.
 *   4. Que no quede ni un enlace vivo a `/panel/inmobiliaria/cobros` en el
 *      código: una redirección es la red para lo que ya está afuera, no una
 *      excusa para seguir escribiendo la ruta vieja.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'

import { describe, it, expect } from 'vitest'

import { UN_SOLO_MODULO_DE_PLATA } from './un-solo-modulo-de-plata'
import { CONCILIACION_EN_UN_SOLO_LUGAR } from './conciliacion-en-un-solo-lugar'
import { RUTAS_POR_CICLO_DE_VIDA } from './rutas-por-ciclo-de-vida'
import { RUTAS_UNIFICADAS_DEL_PANEL } from './rutas-unificadas-del-panel'
import { PANEL } from './arquitectura-del-panel'

const P = PANEL
const RAIZ = process.cwd()
const APP = join(RAIZ, 'src/app/panel/inmobiliaria')

/** Resuelve una URL contra una tabla como lo haría Next: primera que calza. */
function resolver(url: string, tabla = UN_SOLO_MODULO_DE_PLATA): string | null {
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

/**
 * ¿Hay `page.tsx` para esta ruta del panel? Baja segmento a segmento y, en
 * cada nivel, prueba tres formas de carpeta —y las tres son distintas:
 *
 *   · `<segmento>`   — el literal.
 *   · `[algo]`       — dinámica: CONSUME el segmento (`/cobros/cb-1/...`).
 *   · `(algo)`       — route group: NO aparece en la URL, no consume nada.
 *
 * Tratar la dinámica como un route group es cómo un destino con id real
 * («/cobros/cb-1/cuenta-de-cobro») se reporta como 404 estando sana.
 */
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

describe('un solo módulo de plata — la tabla', () => {
  it('todas son temporales (307, reversibles) y absolutas al panel', () => {
    for (const r of UN_SOLO_MODULO_DE_PLATA) {
      expect(r.permanent).toBe(false)
      expect(r.source.startsWith(`${P}/`)).toBe(true)
      expect(r.destination.startsWith(`${P}/`)).toBe(true)
    }
  })

  it('ninguna fuente se repite', () => {
    const fuentes = UN_SOLO_MODULO_DE_PLATA.map((r) => r.source)
    expect(new Set(fuentes).size).toBe(fuentes.length)
  })

  it('la general de /cobros va ÚLTIMA entre las de /cobros (Next aplica la primera que calza)', () => {
    const idx = (s: string) => UN_SOLO_MODULO_DE_PLATA.findIndex((r) => r.source === s)
    const general = idx(`${P}/cobros/:path*`)
    for (const especifica of [
      `${P}/cobros/cobranza/:path*`,
      `${P}/cobros/cartera/:path*`,
      `${P}/cobros/recaudo`,
      `${P}/cobros/reglas-de-mora`,
    ]) {
      expect(idx(especifica), especifica).toBeLessThan(general)
    }
  })

  it('ningún destino es a su vez una fuente (sin cadenas de dos saltos)', () => {
    const todas = [
      ...RUTAS_POR_CICLO_DE_VIDA,
      ...RUTAS_UNIFICADAS_DEL_PANEL,
      ...CONCILIACION_EN_UN_SOLO_LUGAR,
      ...UN_SOLO_MODULO_DE_PLATA,
    ]
    for (const r of todas) {
      const d = r.destination.replace('/:path*', '')
      expect(resolver(d), `${r.source} → ${d} volvería a redirigir`).toBeNull()
    }
  })
})

describe('un solo módulo de plata — cada URL vieja abre lo mismo', () => {
  const casos: Array<[string, string]> = [
    // El listado de cobros: ahora una lectura de Cartera.
    [`${P}/cobros`, `${P}/pagos/cartera/cobros`],
    [`${P}/cobros/cb-1/cuenta-de-cobro`, `${P}/pagos/cartera/cobros/cb-1/cuenta-de-cobro`],
    // Cara inquilinos.
    [`${P}/cobros/recaudo`, `${P}/pagos/recaudo`],
    [`${P}/cobros/cartera`, `${P}/pagos/cartera`],
    [`${P}/cobros/cartera/conceptos`, `${P}/pagos/cartera/conceptos`],
    [`${P}/cobros/cartera/por-pagar`, `${P}/pagos/cartera/por-pagar`],
    [`${P}/cobros/reglas-de-mora`, `${P}/pagos/cartera/reglas-de-mora`],
    // El agente de cobranza, entero.
    [`${P}/cobros/cobranza`, `${P}/pagos/cobranza`],
    [`${P}/cobros/cobranza/deudores/9`, `${P}/pagos/cobranza/deudores/9`],
    [`${P}/cobros/cobranza/compliance/ley-2300`, `${P}/pagos/cobranza/compliance/ley-2300`],
    // La maqueta que Nico señaló.
    [`${P}/pagos/cobros`, `${P}/pagos/cartera/cobros`],
  ]

  it.each(casos)('%s → %s', (de, a) => {
    expect(resolver(de)).toBe(a)
  })

  it.each([...new Set(casos.map(([, a]) => a))])('el destino %s tiene su page.tsx', (destino) => {
    expect(tienePagina(destino)).toBe(true)
  })

  it('lo que ya vivía en /pagos no se toca', () => {
    for (const quieta of ['/pagos', '/pagos/liquidaciones', '/pagos/dispersiones', '/pagos/cxp', '/pagos/cola']) {
      expect(resolver(`${P}${quieta}`), quieta).toBeNull()
    }
  })
})

describe('un solo módulo de plata — el orden entre tablas en next.config.mjs', () => {
  const CONFIG = readFileSync(join(RAIZ, 'next.config.mjs'), 'utf8')

  it('🔴 esta tabla va DESPUÉS de la de conciliación', () => {
    // `/cobros/extracto-bancario` ya redirigía al workspace de Conciliación.
    // Con esta tabla adelante, `/cobros/:path*` se lo comería y esa URL —que
    // vive en correos y en enlaces del Piloto— terminaría en un 404.
    const conciliacion = CONFIG.indexOf('...CONCILIACION_EN_UN_SOLO_LUGAR_DATA')
    const plata = CONFIG.indexOf('...UN_SOLO_MODULO_DE_PLATA_DATA')
    expect(conciliacion).toBeGreaterThan(-1)
    expect(plata).toBeGreaterThan(-1)
    expect(conciliacion).toBeLessThan(plata)
  })

  it('y con ese orden, el extracto bancario sigue llegando a Conciliación', () => {
    const enOrden = [...CONCILIACION_EN_UN_SOLO_LUGAR, ...UN_SOLO_MODULO_DE_PLATA]
    expect(resolver(`${P}/cobros/extracto-bancario`, enOrden)).toBe(`${P}/conciliacion/movimientos`)
  })

  it('la tabla está efectivamente cableada al config', () => {
    expect(CONFIG).toContain('un-solo-modulo-de-plata.data.mjs')
  })
})

describe('un solo módulo de plata — no queda ningún enlace vivo a /cobros', () => {
  it('nadie enlaza a /panel/inmobiliaria/cobros (salvo el extracto, que es de otra tabla)', () => {
    // Se recorre en Node y no con `grep` por el mismo motivo que
    // `arquitectura-del-panel.test.ts`: un pipe POSIX no corre bajo cmd.exe.
    const PATRON = /\/panel\/inmobiliaria\/cobros(?!\/extracto-bancario)/
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
        // Este archivo nombra la ruta vieja a propósito: es de lo que habla.
        if (relativa.endsWith('un-solo-modulo-de-plata.test.ts')) continue
        if (relativa.endsWith('un-solo-modulo-de-plata.data.mjs')) continue
        if (PATRON.test(readFileSync(ruta, 'utf8'))) encontrados.push(relativa)
      }
    }
    for (const r of ['src', 'tests']) {
      if (existsSync(join(RAIZ, r))) recorrer(join(RAIZ, r))
    }
    expect(encontrados).toEqual([])
  })

  it('la carpeta de rutas `cobros` ya no existe bajo el panel', () => {
    expect(existsSync(join(APP, 'cobros'))).toBe(false)
  })
})
