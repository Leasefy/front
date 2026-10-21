/**
 * 🔴 QA-FACT-CONTA-95 (05-10-2026) · CB-R12 en el FRONT: la contabilidad la
 * ven sólo el administrador y el contador.
 *
 * En el navegador, el VIEWER y el COORDINADOR (que traen `reportes:view` de
 * fábrica) entraban a /contabilidad y a /contabilidad/asientos: la pantalla se
 * pintaba entera con sus botones y por debajo 12 pedidos respondían 403
 * (`SIN_ACCESO_A_CONTABILIDAD`). Y al asesor, negado, el cartel le decía «No
 * tienes acceso a Reportes» estando en Contabilidad.
 *
 * Como `nav-badges.test.ts`: se lee la fuente de cada página. Cada pantalla de
 * Contabilidad pasa por `PageGuard` con los roles ADMIN y CONTADOR (lo mismo
 * que exige `ContabilidadLecturaGuard` del back), sigue mirando `reportes`
 * (la matriz en caliente le puede quitar la contabilidad al contador) y el
 * cartel dice «Contabilidad».
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

const RAIZ = __dirname
const paginas = [
  'page.tsx',
  ...readdirSync(RAIZ)
    .filter((d) => statSync(join(RAIZ, d)).isDirectory())
    .map((d) => join(d, 'page.tsx')),
].filter((f) => {
  try {
    return statSync(join(RAIZ, f)).isFile()
  } catch {
    return false
  }
})

/** Las pantallas que también abre el auxiliar contable (20-10-2026). */
const CON_EL_AUXILIAR_CONTABLE = [
  'page.tsx',
  join('asientos', 'page.tsx'),
  join('egresos', 'page.tsx'),
  join('estados-financieros', 'page.tsx'),
  join('gastos', 'page.tsx'),
  join('puc', 'page.tsx'),
  join('reportes', 'page.tsx'),
]

describe('🔴 Contabilidad: sólo el administrador y el contador (CB-R12), y el auxiliar contable donde registra', () => {
  it('hay pantallas que revisar', () => {
    expect(paginas.length).toBeGreaterThanOrEqual(13)
  })

  it.each(paginas)('%s: PageGuard con ADMIN y CONTADOR, reportes y «Contabilidad»', (f) => {
    const src = readFileSync(join(RAIZ, f), 'utf8')
    const guardas = src.match(/<PageGuard\b[^>]*>/g) ?? []
    expect(guardas.length).toBeGreaterThan(0)
    for (const g of guardas) {
      expect(g).toMatch(/module="reportes"/)
      // Roles auxiliares (20-10-2026): donde el auxiliar contable registra o
      // consulta, la lista compartida; en lo demás, sólo admin y contador.
      if (CON_EL_AUXILIAR_CONTABLE.includes(f)) {
        expect(g).toMatch(/roles=\{ROLES_DE_LA_CONTABILIDAD\}/)
      } else {
        expect(g).toMatch(/roles=\{\[AGENCY_ROLES\.ADMIN,\s*AGENCY_ROLES\.CONTADOR\]\}/)
      }
      expect(g).toMatch(/seccion="Contabilidad"/)
    }
  })
})
