/**
 * Las tres pantallas retiradas de Cobranza (equipo, promesas, plantillas)
 * redirigen desde `next.config.mjs`, no sólo desde su `page.tsx` (revisora
 * r27, K7): el `page.tsx` vive debajo de la puerta del módulo y, con el
 * asistente caído, no se monta.
 *
 * Lo que se cuida:
 *   1. Cada destino es una pantalla que EXISTE.
 *   2. Las fuentes son literales: no tapan ninguna otra ruta de Cobranza.
 *   3. La tabla está cableada en `next.config.mjs` y ANTES de las que traen
 *      `/ai/cobranza/:path*` y `/cobros/cobranza/:path*` (si no, sus gemelos
 *      saltarían dos veces).
 *   4. Ningún destino vuelve a redirigir (ni cadena de dos saltos).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

import { COBRANZA_RETIRADAS_DATA } from './cobranza-retiradas.data.mjs'
import { LA_SALA_DE_PAGOS_SE_FUE } from './la-sala-de-pagos-se-fue'
import { UN_SOLO_MODULO_DE_PLATA } from './un-solo-modulo-de-plata'
import { CONCILIACION_EN_UN_SOLO_LUGAR } from './conciliacion-en-un-solo-lugar'
import { RUTAS_POR_CICLO_DE_VIDA } from './rutas-por-ciclo-de-vida'
import { RUTAS_UNIFICADAS_DEL_PANEL } from './rutas-unificadas-del-panel'

const P = '/panel/inmobiliaria'
const C = `${P}/pagos/cobranza`
const RAIZ = process.cwd()

type Regla = { source: string; destination: string; permanent: boolean }

const DESPUES: Regla[] = [
  ...RUTAS_POR_CICLO_DE_VIDA,
  ...RUTAS_UNIFICADAS_DEL_PANEL,
  ...CONCILIACION_EN_UN_SOLO_LUGAR,
  ...UN_SOLO_MODULO_DE_PLATA,
]

/** Como Next: la primera regla que calza. */
function resolver(url: string, tabla: Regla[]): string | null {
  for (const r of tabla) {
    const comodin = r.source.endsWith('/:path*')
    const base = comodin ? r.source.slice(0, -'/:path*'.length) : r.source
    if (url === base) return comodin ? r.destination.replace('/:path*', '') : r.destination
    if (comodin && url.startsWith(`${base}/`)) return r.destination.replace('/:path*', url.slice(base.length))
  }
  return null
}

const CASOS: Array<[string, string]> = [
  [`${C}/equipo`, C],
  [`${C}/promesas`, `${C}/acuerdos?estado=vigente`],
  [`${C}/plantillas`, `${C}/configuracion`],
]

describe('las pantallas retiradas de Cobranza redirigen sin depender del asistente', () => {
  it.each(CASOS)('%s → %s', (de, a) => {
    expect(resolver(de, COBRANZA_RETIRADAS_DATA)).toBe(a)
    // Los gemelos viejos llegan en UN salto, sin pasar por /pagos/cobranza/<x>.
    const resto = de.slice(C.length)
    expect(resolver(`${P}/ai/cobranza${resto}`, COBRANZA_RETIRADAS_DATA)).toBe(a)
    expect(resolver(`${P}/cobros/cobranza${resto}`, COBRANZA_RETIRADAS_DATA)).toBe(a)
  })

  it('cada destino es una pantalla que existe', () => {
    for (const [, a] of CASOS) {
      const ruta = (a.split('?')[0] ?? a).replace(`${P}/`, '')
      expect(existsSync(join(RAIZ, 'src/app/panel/inmobiliaria', ruta, 'page.tsx')), a).toBe(true)
    }
  })

  it('las fuentes son literales: no tapan ninguna otra ruta', () => {
    for (const r of COBRANZA_RETIRADAS_DATA) expect(r.source).not.toMatch(/:/)
    for (const viva of ['', '/acuerdos', '/configuracion', '/deudores', '/equipos', '/promesas/1']) {
      expect(resolver(`${C}${viva}`, COBRANZA_RETIRADAS_DATA), viva).toBeNull()
    }
  })

  it('ningún destino vuelve a redirigir', () => {
    for (const [, a] of CASOS) {
      const sinQuery = a.split('?')[0] ?? a
      expect(resolver(sinQuery, [...LA_SALA_DE_PAGOS_SE_FUE, ...COBRANZA_RETIRADAS_DATA, ...DESPUES]), a).toBeNull()
    }
  })

  it('🔴 está cableada en next.config.mjs, antes de las tablas con comodines de cobranza', () => {
    const CONFIG = readFileSync(join(RAIZ, 'next.config.mjs'), 'utf8')
    expect(CONFIG).toContain('cobranza-retiradas.data.mjs')
    const mia = CONFIG.indexOf('...COBRANZA_RETIRADAS_DATA')
    expect(mia).toBeGreaterThan(-1)
    expect(mia).toBeLessThan(CONFIG.indexOf('...RUTAS_POR_CICLO_DE_VIDA_DATA'))
    expect(mia).toBeLessThan(CONFIG.indexOf('...UN_SOLO_MODULO_DE_PLATA_DATA'))
  })
})
