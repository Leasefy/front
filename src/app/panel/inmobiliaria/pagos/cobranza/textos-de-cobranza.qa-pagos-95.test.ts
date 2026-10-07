/**
 * 🔴 N-11 (QA-PAGOS-95, 05-10-2026): en Cobranza quedaban voseo («Escribilo»,
 * Crear acuerdo general), la píldora interna «Fase 37» (Analítica) y, en el
 * Reporte diario, «PKR», «100.0%» y la fecha ISO «2026-10-04».
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const leer = (ruta: string) => readFileSync(join(process.cwd(), 'src', ruta), 'utf8')

describe('N-11 · textos de Cobranza', () => {
  it('🔴 tuteo: «Escríbelo», nunca «Escribilo»', () => {
    const s = leer('components/inmobiliaria/cobranza/AcuerdoGeneralForm.tsx')
    expect(s).not.toContain('Escribilo')
    expect(s).toContain('Escríbelo como se lo dirías tú.')
  })

  it('🔴 la insignia de «sin datos» no pinta «Fase N»', () => {
    expect(leer('components/data-display/no-data-yet-badge.tsx')).not.toMatch(/Fase \{phase\}/)
  })

  it('🔴 el reporte diario: «% recuperado», coma decimal y el día en palabras', () => {
    const s = leer('app/panel/inmobiliaria/pagos/cobranza/reporte/page.tsx')
    expect(s).not.toMatch(/toFixed\(1\)\}%/)
    expect(s).not.toMatch(/>\s*PKR\s*</)
    // La fecha cruda como texto (una línea con sólo la expresión); `key={entry.report_date}` no cuenta.
    expect(s).not.toMatch(/^\s*\{(entry|data)\.report_date\}\s*$/m)
    expect(s).toMatch(/porcentajeLegible\(/)
    expect(s).toMatch(/diaDelReporte\(/)
  })
})
