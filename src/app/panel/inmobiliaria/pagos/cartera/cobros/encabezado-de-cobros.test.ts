/**
 * El encabezado de /cobros (Nico, 2026-09-03):
 *
 *   - «Extracto bancario» NO va acá: el extracto vive en Conciliación, que es
 *     otra sección. Un botón que salta de sección desde el encabezado de otra
 *     hace que las secciones dejen de significar algo.
 *   - B-09/N-28 (QA-PAGOS-95 r2, 05-10-2026): el engranaje de «Configurar
 *     recordatorios» salió (ofrecía avisos que contradicen J-12). En su lugar,
 *     «Recordatorios» lleva a Cobranza › Recordatorios, que sí sigue J-12.
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
  join(process.cwd(), 'src/app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx'),
  'utf8',
)

describe('el encabezado de Cobros', () => {
  it('ya no enlaza al extracto bancario: eso es Conciliación', () => {
    expect(PAGINA).not.toContain('/panel/inmobiliaria/conciliacion/movimientos')
    expect(PAGINA).not.toContain('Extracto bancario')
  })

  it('🔴 B-09/N-28: ya no configura recordatorios acá; lleva a Cobranza › Recordatorios', () => {
    expect(PAGINA).not.toContain('aria-label="Configuración de cobros"')
    expect(PAGINA).not.toContain('RecordatorioConfig')
    expect(PAGINA).toContain("'/panel/inmobiliaria/pagos/cobranza/recordatorios'")
    expect(PAGINA).toContain('data-testid="ir-a-recordatorios"')
  })

  it('el orden es Recordatorios → Reglas de mora → Hacer recibo de caja', () => {
    const recordatorios = PAGINA.indexOf('data-testid="ir-a-recordatorios"')
    const reglas = PAGINA.indexOf('Reglas de mora</span>')
    const recibo = PAGINA.indexOf("t('recibos.hacer')")
    expect(recordatorios).toBeGreaterThan(-1)
    expect(reglas).toBeGreaterThan(recordatorios)
    expect(recibo).toBeGreaterThan(reglas)
  })
})
