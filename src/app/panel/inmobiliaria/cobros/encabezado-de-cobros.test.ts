/**
 * El encabezado de /cobros (Nico, 2026-09-03):
 *
 *   - «Extracto bancario» NO va acá: el extracto vive en Conciliación, que es
 *     otra sección. Un botón que salta de sección desde el encabezado de otra
 *     hace que las secciones dejen de significar algo.
 *   - «Configuración» es un engranaje sin texto y es lo PRIMERO del grupo: la
 *     acción que menos se usa es la que menos tiene que pesar.
 *   - Después vienen «Reglas de mora» y el primario «Hacer recibo de caja».
 *
 * Se lee el archivo porque lo que se protege es la composición del
 * encabezado, no su comportamiento: la página entera necesita auth, cinco
 * hooks de datos y el diálogo del recibo para montarse.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGINA = readFileSync(
  join(process.cwd(), 'src/app/panel/inmobiliaria/cobros/page.tsx'),
  'utf8',
)

describe('el encabezado de Cobros', () => {
  it('ya no enlaza al extracto bancario: eso es Conciliación', () => {
    expect(PAGINA).not.toContain('/panel/inmobiliaria/conciliacion/movimientos')
    expect(PAGINA).not.toContain('Extracto bancario')
  })

  it('la configuración es un engranaje sin texto, con nombre accesible', () => {
    expect(PAGINA).toMatch(/import \{[^}]*\bIconButton\b[^}]*\} from '@leasefy\/cadence'/)
    expect(PAGINA).toContain('aria-label="Configuración de cobros"')
    // Sin texto visible al lado del engranaje: era «Configuración» escrito.
    expect(PAGINA).not.toContain("t('inmobiliaria.config.title')")
  })

  it('el orden es engranaje → Reglas de mora → Hacer recibo de caja', () => {
    const engranaje = PAGINA.indexOf('aria-label="Configuración de cobros"')
    const reglas = PAGINA.indexOf('Reglas de mora')
    const recibo = PAGINA.indexOf("t('recibos.hacer')")
    expect(engranaje).toBeGreaterThan(-1)
    expect(reglas).toBeGreaterThan(engranaje)
    expect(recibo).toBeGreaterThan(reglas)
  })
})
